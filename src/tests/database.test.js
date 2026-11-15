// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { it, expect } from "vitest";
it("migration runs in PostgreSQL; real RLS isolates owners and preserves deleted references", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
    await pg.exec(
      await readFile(
        new URL("../../supabase/migrations/0001_init.sql", import.meta.url),
        "utf8",
      ),
    );
    const a = "11111111-1111-4111-8111-111111111111",
      b = "22222222-2222-4222-8222-222222222222",
      movie = "33333333-3333-4333-8333-333333333333";
    await pg.exec(
      `set role authenticated; set request.jwt.claim.sub='${a}'; insert into public.custom_movies(id,created_by,title,release_year,synopsis,genre_ids) values('${movie}','${a}','Student film',2026,'A student-made short movie.',array[18]); insert into public.shelf_items(user_id,custom_movie_id) values('${a}','${movie}');`,
    );
    await expect(
      pg.exec(
        `update public.custom_movies set created_by='${b}' where id='${movie}'`,
      ),
    ).rejects.toThrow();
    await pg.exec(`set request.jwt.claim.sub='${b}'`);
    expect(
      (await pg.query("select * from public.custom_movies")).rows,
    ).toHaveLength(1);
    expect(
      (await pg.query("select * from public.shelf_items")).rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          `update public.custom_movies set title='hijacked' where id='${movie}' returning id`,
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      pg.exec(
        `insert into public.shelf_items(user_id,tmdb_id) values('${a}',12)`,
      ),
    ).rejects.toThrow();
    await pg.exec(
      `insert into public.shelf_items(user_id,custom_movie_id) values('${b}','${movie}'); set request.jwt.claim.sub='${a}'; update public.custom_movies set deleted_at=now() where id='${movie}';`,
    );
    await expect(
      pg.exec(
        `update public.custom_movies set deleted_at=null where id='${movie}'`,
      ),
    ).resolves.toBeDefined(); // RLS prevents matching tombstones.
    await pg.exec(`set request.jwt.claim.sub='${b}'`);
    expect(
      (await pg.query("select * from public.custom_movies")).rows,
    ).toHaveLength(0);
    await pg.exec(
      `update public.shelf_items set review='Still kept' where user_id='${b}'`,
    );
    expect(
      (await pg.query("select review from public.shelf_items")).rows[0].review,
    ).toBe("Still kept");
    await pg.exec("set role anon");
    await expect(
      pg.exec(
        `insert into public.custom_movies(created_by,title,release_year,synopsis,genre_ids) values('${b}','Denied',2026,'Not allowed here.',array[18])`,
      ),
    ).rejects.toThrow();
    await expect(
      pg.query("select * from public.shelf_items"),
    ).rejects.toThrow();
  } finally {
    await pg.close();
  }
}, 30000);
