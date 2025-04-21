from fastapi import APIRouter
from database import db
import random
from time import sleep

router = APIRouter(prefix="/populate", tags=["Populate"])

@router.post("/")
def populate_graph():
    sample_people = [
    {
        "name": "Alan Turing",
        "label": "Mathematician",
        "bio": "Father of theoretical computer science and artificial intelligence.",
        "birth": 1912,
        "field": "Computer Science"
    },
    {
        "name": "Ada Lovelace",
        "label": "Mathematician",
        "bio": "First programmer who wrote an algorithm for Charles Babbage's analytical engine.",
        "birth": 1815,
        "field": "Mathematics"
    },
    {
        "name": "Grace Hopper",
        "label": "Computer Scientist",
        "bio": "Pioneer of computer programming and inventor of the first compiler.",
        "birth": 1906,
        "field": "Computer Science"
    },
    {
        "name": "Bill Gates",
        "label": "Entrepreneur",
        "bio": "Microsoft co-founder and philanthropist.",
        "birth": 1955,
        "field": "Software Engineering"
    },
    {
        "name": "Marie Curie",
        "label": "Scientist",
        "bio": "Pioneered research on radioactivity; first woman to win a Nobel Prize.",
        "birth": 1867,
        "field": "Physics and Chemistry"
    },
    {
        "name": "Nikola Tesla",
        "label": "Inventor",
        "bio": "Invented AC electricity system, radio components, and more.",
        "birth": 1856,
        "field": "Electrical Engineering"
    },
    {
        "name": "Steve Jobs",
        "label": "Entrepreneur",
        "bio": "Co-founder of Apple Inc. and pioneer of the personal computing revolution.",
        "birth": 1955,
        "field": "Consumer Electronics"
    },
    {
        "name": "Hedy Lamarr",
        "label": "Inventor",
        "bio": "Co-invented spread spectrum communication technology.",
        "birth": 1914,
        "field": "Wireless Communications"
    },
    {
        "name": "Linus Torvalds",
        "label": "Engineer",
        "bio": "Creator of the Linux kernel and Git version control system.",
        "birth": 1969,
        "field": "Operating Systems"
    },
    {
        "name": "Dennis Ritchie",
        "label": "Computer Scientist",
        "bio": "Creator of the C programming language and co-developer of Unix.",
        "birth": 1941,
        "field": "Programming Languages"
    },
    {
        "name": "Guido van Rossum",
        "label": "Engineer",
        "bio": "Creator of the Python programming language.",
        "birth": 1956,
        "field": "Programming Languages"
    },
    {
        "name": "Barbara Liskov",
        "label": "Scientist",
        "bio": "Developed the Liskov Substitution Principle and worked on distributed systems.",
        "birth": 1939,
        "field": "Software Engineering"
    },
    {
        "name": "Margaret Hamilton",
        "label": "Software Engineer",
        "bio": "Led the development of on-board flight software for NASA's Apollo missions.",
        "birth": 1936,
        "field": "Aerospace Software"
    },
    {
        "name": "Donald Knuth",
        "label": "Scientist",
        "bio": "Author of 'The Art of Computer Programming' and creator of TeX.",
        "birth": 1938,
        "field": "Algorithms and Typesetting"
    },
    {
        "name": "Tim Berners-Lee",
        "label": "Engineer",
        "bio": "Inventor of the World Wide Web.",
        "birth": 1955,
        "field": "Web Technology"
    },
    {
        "name": "Bjarne Stroustrup",
        "label": "Scientist",
        "bio": "Inventor of the C++ programming language.",
        "birth": 1950,
        "field": "Programming Languages"
    },
    {
        "name": "Elon Musk",
        "label": "Entrepreneur",
        "bio": "CEO of Tesla, founder of SpaceX, Neuralink, and X (formerly Twitter).",
        "birth": 1971,
        "field": "Space and AI"
    },
    {
        "name": "James Gosling",
        "label": "Engineer",
        "bio": "Creator of the Java programming language.",
        "birth": 1955,
        "field": "Software Development"
    },
    {
        "name": "Sheryl Sandberg",
        "label": "Executive",
        "bio": "Former COO of Facebook; author of 'Lean In'.",
        "birth": 1969,
        "field": "Business Leadership"
    },
    {
        "name": "Mark Zuckerberg",
        "label": "Entrepreneur",
        "bio": "Co-founder and CEO of Meta Platforms (Facebook).",
        "birth": 1984,
        "field": "Social Media Technology"
    }
]
    relationships_meta = [
        {"type": "INSPIRED", "context": "historical influence"},
        {"type": "MENTORED", "context": "educational guidance"},
        {"type": "WORKED_WITH", "context": "collaboration"},
        {"type": "COFOUNDED", "context": "startup cofounders"},
        {"type": "COMPETED_WITH", "context": "market rivalry"},
    ]

    # 1. Create nodes with labels and bios
    for person in sample_people:
        cypher = f"""
        MERGE (p:Person:`{person['label']}` {{name: $name}})
        SET p.bio = $bio,
            p.birth = $birth,
            p.field = $field
        """
        db.query(cypher, {
            "name": person["name"],
            "bio": person["bio"],
            "birth": person["birth"],
            "field": person["field"]
        })

    # 2. Create 40 random relationships with metadata
    for _ in range(40):
        a, b = random.sample(sample_people, 2)
        rel = random.choice(relationships_meta)
        since = random.randint(1960, 2020)

        cypher = f"""
        MATCH (a {{name: $a}}), (b {{name: $b}})
        MERGE (a)-[r:{rel['type']}]->(b)
        SET r.context = $context, r.since = $since
        """
        db.query(cypher, {
            "a": a["name"],
            "b": b["name"],
            "context": rel["context"],
            "since": since
        })

    return {
        "status": "ok",
        "nodes": len(sample_people),
        "relationships": 40,
        "labels": list(set(p["label"] for p in sample_people))
    }

@router.delete("/")
def reset_graph():
    try:
        db.query("MATCH (n) DETACH DELETE n")
        return {"status": "graph cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset graph: {str(e)}")