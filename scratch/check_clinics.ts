import { getSiteSettings } from "./server/db";

async function check() {
  const settings = await getSiteSettings();
  console.log("Clinics in DB:", JSON.stringify(settings.clinics, null, 2));
}

check();
