  
  // All HE Wiki nodes by category                                                                                                                                            
  MATCH (n:HEWikiNode)                                          
  RETURN n.category AS category, count(*) AS count
  ORDER BY count DESC

  // All relationships by type
  MATCH (a:HEWikiNode)-[r]->(b:HEWikiNode)
  RETURN type(r) AS type, count(*) AS count

  Browse nodes

  // List all nodes (name + category)
  MATCH (n:HEWikiNode)
  RETURN n.name, n.category, n.id
  ORDER BY n.category, n.name

  // Get a specific node with all properties
  MATCH (n:HEWikiNode {id: 'horizon-europe'}) RETURN n

  // Find nodes by category
  MATCH (n:HEWikiNode {category: 'strategy'}) RETURN n.name, n.id

  Explore relationships

  // All connections from a specific node
  MATCH (n:HEWikiNode {id: 'horizon-europe'})-[r]-(m:HEWikiNode)
  RETURN n.name, type(r), m.name, m.category

  // Most connected nodes (hubs)
  MATCH (n:HEWikiNode)-[r]-()
  RETURN n.name, n.category, count(r) AS connections
  ORDER BY connections DESC LIMIT 10

  // Cross-category relationships
  MATCH (a:HEWikiNode)-[r]->(b:HEWikiNode)
  WHERE a.category <> b.category
  RETURN a.category, b.category, count(*) AS count
  ORDER BY count DESC

  Visualize subgraphs

  // Full graph (use in Neo4j Browser for visual)
  MATCH (a:HEWikiNode)-[r]->(b:HEWikiNode) RETURN a, r, b

  // Neighbourhood of a single node
  MATCH (n:HEWikiNode {id: 'artificial-intelligence'})-[r]-(m:HEWikiNode)
  RETURN n, r, m

  // Only curated relationships (frontmatter)
  MATCH (a:HEWikiNode)-[r:RELATES_TO]->(b:HEWikiNode) RETURN a, r, b

  Cleanup (if needed)

  // Delete all HE Wiki data (same as DELETE /hewiki/all)
  MATCH (n:HEWikiNode) WHERE n.source = 'he_wiki' DETACH DELETE n
