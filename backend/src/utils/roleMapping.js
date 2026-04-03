const APP_TO_DB_ROLE = {
  user: "Attendee",
  organizer: "Organizer",
  staff: "Staff",
  admin: "Admin",
};

const DB_TO_APP_ROLE = {
  Attendee: "user",
  Organizer: "organizer",
  Staff: "staff",
  Admin: "admin",
};

const toDbRole = (role) => APP_TO_DB_ROLE[role] || APP_TO_DB_ROLE.user;

const toAppRole = (role) => DB_TO_APP_ROLE[role] || "user";

module.exports = {
  toDbRole,
  toAppRole,
};
