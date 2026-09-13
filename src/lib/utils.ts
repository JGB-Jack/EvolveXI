import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// A server action call that hangs with no response (a dropped mobile
// connection, a backgrounded tab) would otherwise leave a "Saving..."
// button stuck forever, since nothing ever resolves or rejects - this
// forces it to fail after a reasonable wait instead.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("That took too long - check your connection and try again.")),
        ms,
      ),
    ),
  ]);
}
