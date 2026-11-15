/** Wait for queued pipe writes before the CLI's explicit exit (handles live background services). */
export async function exitCliAfterOutputDrain(code: number): Promise<never> {
  await Promise.all([process.stdout, process.stderr].map((stream) =>
    new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => { stream.off("error", onError); reject(error); };
      stream.once("error", onError);
      // Bun can acknowledge an empty write before earlier native pipe writes flush.
      // end's callback waits for the actual stream finish, unlike that sentinel.
      stream.end(() => {
        stream.off("error", onError);
        resolve();
      });
    }),
  ));
  process.exit(code);
}
