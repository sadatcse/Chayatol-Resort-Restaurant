// One-off maintenance script: drops the legacy unique index on
// Customer.phoneNumber so multiple guests can share/omit a phone number.
// Run once after deploying the multi-guest schema change:
//   node scripts/drop-customer-phone-index.js
require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("customers");
  const indexes = await collection.indexes();
  const phoneIndex = indexes.find(
    (idx) => idx.key && Object.keys(idx.key).length === 1 && idx.key.phoneNumber === 1 && idx.unique
  );

  if (!phoneIndex) {
    console.log("No unique phoneNumber index found — nothing to do.");
  } else {
    await collection.dropIndex(phoneIndex.name);
    console.log(`Dropped unique index "${phoneIndex.name}" on customers.phoneNumber`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
