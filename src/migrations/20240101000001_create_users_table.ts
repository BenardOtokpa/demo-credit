import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().notNullable();
    table.string('full_name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('phone_number', 20).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('bvn', 11).notNullable().unique();
    table.boolean('is_blacklisted').defaultTo(false).notNullable();
    table.timestamps(true, true);

    table.index(['email'], 'idx_users_email');
    table.index(['bvn'], 'idx_users_bvn');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}