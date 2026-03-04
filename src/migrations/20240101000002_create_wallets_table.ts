import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("wallets", (table) => {
    table.uuid("id").primary().notNullable();
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.decimal("balance", 20, 4).defaultTo(0.0).notNullable();
    table.string("currency", 3).defaultTo("NGN").notNullable();
    table.boolean("is_active").defaultTo(true).notNullable();
    table.timestamps(true, true);

    table.index(["user_id"], "idx_wallets_user_id");
    table.unique(["user_id"], { indexName: "uq_wallets_user_id" });
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists("wallets");
}
