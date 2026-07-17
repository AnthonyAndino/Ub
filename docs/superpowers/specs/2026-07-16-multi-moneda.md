# Multi-moneda: $ y L por transacción

## Contexto

El usuario necesita registrar transacciones tanto en Dólares ($) como en Lempiras (L),
y que el sistema conozca el valor equivalente en ambas monedas usando el tipo de cambio
del momento. Los reportes y dashboard deben poder verse en la moneda preferida del usuario.

## Modelo de datos

### Transaction (nuevos campos)

```prisma
model Transaction {
  // ...campos existentes...
  currency     String   @default("L")    // "$" o "L"
  exchangeRate Decimal? @db.Decimal(10, 4)  // cuántos L por $ (ej: 25.50)
}
```

- `currency`: moneda en que se registró la transacción
- `exchangeRate`: tasa de cambio del momento. Si la transacción es en L, puede ir null (es 1 implícitamente)
- Si `currency = "$"`: el monto real en L es `amount * exchangeRate`
- Si `currency = "L"`: el monto en $ es `amount / exchangeRate` (o `amount / 1` si es null)

### User (ya existe)

```prisma
model User {
  // ...campos existentes...
  currency String @default("L")   // moneda preferida para visualizar
}
```

## Lógica de conversión

```
Para mostrar en $:
  - transacción en $: amount
  - transacción en L: amount / exchangeRate (o amount si no tiene rate)

Para mostrar en L:
  - transacción en L: amount
  - transacción en $: amount * exchangeRate
```

## UI - Formulario de transacción

1. Toggle $/L junto al campo de monto (botones de selección estilizados)
2. Campo de "Tasa de cambio" que aparece solo cuando la moneda es $
   - Se auto-completa con la última tasa usada
   - Es editable por si cambió
3. Al guardar: se envía moneda + tasa + monto

## UI - Dashboard

- Usa la moneda preferida del usuario para mostrar totales
- Convierte cada transacción usando su tasa histórica antes de sumar
- Las cards muestran el signo de la moneda preferida ($ o L)

## UI - Sidebar

- El toggle de moneda ya existe, cambia la moneda preferida del usuario
- Al cambiar, se actualizan todos los montos visibles

## UI - Historial y transacciones recientes

- Cada fila muestra el monto original con el signo de su moneda
- Si la moneda de la fila difiere de la preferida, mostrar también el equivalente
- Ej: "+$100.00 (~L2,550.00)"

## Archivos a modificar

1. `prisma/schema.prisma` — agregar currency + exchangeRate a Transaction
2. `prisma/seed.ts` — incluir currency y exchangeRate en datos demo
3. `lib/actions/transactions.ts` — validar currency/exchangeRate, devolverlos en queries
4. `components/transaction-form.tsx` — toggle $/L + campo tasa de cambio
5. `components/transaction-list.tsx` — mostrar moneda original + equivalente
6. `app/page.tsx` — convertir montos a moneda preferida antes de sumar
7. `components/dashboard-cards.tsx` — aceptar currency como prop
8. `app/historial/page.tsx` — convertir montos para la tabla
9. `app/graficos/page.tsx` — convertir montos para gráficos

## No se modifica

- Wishlist: los deseos siempre son en la moneda preferida del usuario (no por transacción)
- Papelera: solo hereda los datos de transacción

## Tasa de cambio por defecto

La tasa inicial sugerida es 25 L/$. El usuario puede cambiarla al registrar.
El sistema recuerda la última tasa usada por sesión (se almacena en el form).
