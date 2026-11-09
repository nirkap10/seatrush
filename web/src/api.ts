// Every request to the SeatRush API goes through the api() function below.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Where the logged-in username is kept, one per browser window (step 5).
export const USERNAME_KEY = 'seatrush-username';

// When the API or the database collapsed: no answer at all, or a 500 error.
const SORRY =
  "We're sorry, something went wrong on our side. Please try again later.";

// True when the error is our side collapsing, not something the fan did.
export function serverDown(error: Error): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

// An error from the API, with the server's own message, such as
// "Someone just took B3", and its HTTP status, such as 409.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Sends one request and returns the answer, already read from JSON.
// T is the type of the answer, for example api<SeatEvent>('/events/1').
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const username = sessionStorage.getItem(USERNAME_KEY);
  if (username) {
    headers['X-Username'] = username;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // fetch only throws when there's no answer at all: the server is down,
    // or the fan is offline.
    throw new ApiError(SORRY, 0);
  }

  const data = await response.json().catch(() => null);
  if (response.status >= 500) {
    throw new ApiError(SORRY, response.status);
  }
  if (!response.ok) {
    // NestJS sends { message: '...' }, or a list of messages for bad input.
    const message = Array.isArray(data?.message)
      ? data.message.join('. ')
      : data?.message;
    throw new ApiError(
      message ?? SORRY,
      response.status,
    );
  }
  return data as T;
}
