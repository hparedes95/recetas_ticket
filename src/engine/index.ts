// Barrel del motor: superficie pública para la app.
export * from './planner';
export * from './suggest';
export * from './generator';
export * from './history';
export * from './mmr';
export * from './config';
export * from './normalize';
export {
  parseTicketText,
  productFromText,
  productFromKey,
  newId,
  SAMPLE_TICKET,
} from './ticketParser';
