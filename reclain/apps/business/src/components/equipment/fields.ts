// Field names and limits the service and equipment forms share with the code that checks them.
// Plain constants (no imports), safe on both sides of the server/client boundary.

// How many people one service can ask for (services.people_needed in the database).
export const PEOPLE_NEEDED_MAX = 20;
// How many units of one item a service can use, and how many a business can own.
export const RESOURCE_USE_MAX = 999;
export const RESOURCE_QUANTITY_MAX = 999;
export const RESOURCE_NAME_MIN = 2;
export const RESOURCE_NAME_MAX = 60;
export const RESOURCE_NOTES_MAX = 200;

// The service form field that says how many of a resource the service uses.
export const resourceField = (resourceId: string) => `resource:${resourceId}`;
