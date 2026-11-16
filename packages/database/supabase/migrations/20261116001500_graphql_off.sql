-- GraphQL is off (decisions.md, The site: Background jobs): the site reads
-- only through the Data API, and nothing in the site, Hudhud, the scripts
-- or the tests uses GraphQL. The extension isn't installed in production;
-- this keeps it so. Its schemas are left as they are.
drop extension if exists pg_graphql;
