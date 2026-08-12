import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring the Supabase JWT (customer ordering flow —
 * section 3: "Customers never authenticate"). Those routes are instead
 * scoped by the opaque table token in the URL/body, resolved server-side.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
