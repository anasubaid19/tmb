// Buat hash scrypt untuk kolom password_hash (sheet users, role admin).
// Pakai: bun run hash-password "password-rahasia"  → tempel hasilnya ke spreadsheet.
import { hashPassword } from "../src/lib/password.server";

const password = process.argv[2];
if (!password) {
  console.error('Pakai: bun run hash-password "password-rahasia"');
  process.exit(1);
}
console.log(await hashPassword(password));
