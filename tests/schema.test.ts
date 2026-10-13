import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { it, expect } from "vitest";
it("SQLite composite constraints block foreign-tenant references and duplicate asset codes", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("migrations/0001_schema.sql", "utf8"));
  db.exec(`INSERT INTO tenants(id,name,slug,created_at) VALUES('a','A','a','now'),('b','B','b','now');
 INSERT INTO users VALUES('ua','User A','a@test','hash','now'),('ub','User B','b@test','hash','now');
 INSERT INTO memberships VALUES('a','ua','admin','now'),('b','ub','technician','now');
 INSERT INTO assets VALUES('asset-a','a','PC-1','PC A','PC','Room','active','now'),('asset-b','b','PC-1','PC B','PC','Room','active','now');`);
  const insert = db.prepare(
    `INSERT INTO tickets(id,tenant_id,ticket_no,asset_id,requester_id,assignee_id,title,description,priority,status,location,created_at,updated_at) VALUES(?,'a',?,?,?,?,'test','test','normal','open','room','now','now')`,
  );
  expect(() => insert.run("t1", "IT-00001", "asset-b", "ua", null)).toThrow(
    /FOREIGN KEY/,
  );
  expect(() => insert.run("t2", "IT-00002", "asset-a", "ub", null)).toThrow(
    /FOREIGN KEY/,
  );
  expect(() => insert.run("t3", "IT-00003", "asset-a", "ua", "ub")).toThrow(
    /FOREIGN KEY/,
  );
  expect(() =>
    insert.run("t4", "IT-00004", "asset-a", "ua", null),
  ).not.toThrow();
  expect(() =>
    db.exec(
      "INSERT INTO assets VALUES('duplicate','a','PC-1','duplicate','PC','Room','active','now')",
    ),
  ).toThrow(/UNIQUE/);
  db.close();
});
