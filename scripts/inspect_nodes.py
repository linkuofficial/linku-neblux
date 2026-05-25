import json

with open('data/all_nodes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

targets = ['humanities_field', 'social_science_field', 'arts_field', 'history_field', 'astronomy_field']
for n in data['nodes']:
    if n['id'] in targets:
        print(f"=== {n['id']} ===")
        print(f"  desc: {n['description']}")
        print(f"  era: {n.get('era')}")
        print(f"  tags: {n.get('display_tags')}")
        print(f"  domain: {n.get('domain')}")
        conns = n.get('connections', [])
        print(f"  connections ({len(conns)}):")
        for c in conns:
            print(f"    -> {c.get('target')} [{c.get('relation_type')}]")
        print()
