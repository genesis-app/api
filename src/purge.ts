import { deleteUser, getMetadata, getPurgableUsers, setMetadata } from "./sql";

export function checkPurge() {
  return purge();
  const lastPurged = getMetadata("lastPurged");
  if (!lastPurged) return purge();
  const lastPurgedDate = new Date(Number(lastPurged));

  const now = new Date();

  const diff = now.getTime() - lastPurgedDate.getTime();

  const days = diff / (1000 * 60 * 60 * 24);

  if (days >= 1) purge();
}

function purge() {
  console.log("Purging users");
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const users = getPurgableUsers(oneMonthAgo.getTime());
  for (const user of users) {
    deleteUser(user.uuid);
  }
  console.log(`Purged ${users.length} users`);

  setMetadata("lastPurged", Date.now().toString());
}
