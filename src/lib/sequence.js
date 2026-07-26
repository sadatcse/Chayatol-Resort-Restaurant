import dbConnect from "./db";
import Counter from "../models/Counter";

/**
 * Atomically returns the next integer in the named sequence. Safe under
 * concurrent callers: MongoDB executes findOneAndUpdate's $inc as a single
 * atomic operation on the document, so two simultaneous requests can never
 * receive the same value (unlike a separate find-max-then-increment read/
 * write pair).
 *
 * `seedFn`, if provided, is called only the very first time this key is
 * used (e.g. right after deploying this on a database that already has
 * records numbered the old way) and should resolve to the current highest
 * number already in use, so the sequence continues from there instead of
 * restarting at 1 and colliding with (or jumping behind) existing records.
 * If two requests race to bootstrap the same brand-new key, exactly one
 * "wins" the create and the other safely falls through to the normal
 * atomic increment on the now-existing counter.
 */
export async function getNextSequence(key, seedFn) {
  await dbConnect();

  if (typeof seedFn === "function") {
    const existing = await Counter.findById(key);
    if (!existing) {
      const seedValue = (await seedFn()) || 0;
      try {
        const created = await Counter.create({ _id: key, seq: seedValue + 1 });
        return created.seq;
      } catch (e) {
        if (e.code !== 11000) throw e;
        // Another request bootstrapped this key first — fall through.
      }
    }
  }

  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
