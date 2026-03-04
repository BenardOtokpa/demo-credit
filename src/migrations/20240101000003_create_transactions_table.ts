import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("transactions", (table) => {
    table.uuid("id").primary().notNullable();
    table
      .uuid("wallet_id")
      .notNullable()
      .references("id")
      .inTable("wallets")
      .onDelete("CASCADE");
    table.string("reference", 100).notNullable().unique();
    table.enum("type", ["credit", "debit"]).notNullable();
    table.decimal("amount", 20, 4).notNullable();
    table.decimal("balance_before", 20, 4).notNullable();
    table.decimal("balance_after", 20, 4).notNullable();
    table.string("description", 500).nullable();
    table
      .enum("status", ["pending", "successful", "failed"])
      .defaultTo("pending")
      .notNullable();
    table.json("metadata").nullable();
    table.timestamps(true, true);

    table.index(["wallet_id"], "idx_transactions_wallet_id");
    table.index(["reference"], "idx_transactions_reference");
    table.index(["type"], "idx_transactions_type");
    table.index(["status"], "idx_transactions_status");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("transactions");
}
