-- pg_net is non-relocatable, so a drop/recreate is required to keep the
-- extension itself out of the exposed public schema. The net schema/API remains
-- `net.http_post`; only ephemeral request/response queue rows are discarded.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
