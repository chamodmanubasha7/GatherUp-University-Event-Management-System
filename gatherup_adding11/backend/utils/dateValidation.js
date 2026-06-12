/**
 * Reject dates strictly after "now" (server clock). Used for lost/found report dates.
 */
export function assertNotFutureDate(dateInput, fieldLabel = 'Date') {
  if (dateInput == null || dateInput === '') {
    throw new Error(`${fieldLabel} is required`);
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${fieldLabel} is invalid`);
  }
  if (d.getTime() > Date.now()) {
    throw new Error(`${fieldLabel} cannot be in the future`);
  }
}
