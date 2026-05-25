import json

with open('data/all_nodes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

fixes = {
    'humanities_field': {
        'description': "The humanities study human culture, expression, and meaning through language, literature, philosophy, and history. Unlike the natural sciences, they emphasize interpretation and context over prediction and measurement. Their methods bridge across disciplines \u2014 hermeneutics informs legal reasoning, narrative theory shapes medical practice, and historical analysis is fundamental to every social science. The humanities ask what it means to be human, questions that shape civilizations.",
        'new_connections': [
            {'target': 'rhetoric_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False},
            {'target': 'hermeneutics_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False}
        ]
    },
    'social_science_field': {
        'description': "Social science studies human society, behavior, and institutions through systematic observation, experimentation, and statistical analysis. It encompasses economics, sociology, political science, psychology, and anthropology as major branches. Beyond its own domain, its quantitative methods bridge into medicine through epidemiology, into technology through human-computer interaction, and into engineering through systems design. It transformed governance from intuition to evidence-based policy.",
        'new_connections': [
            {'target': 'statistical_inference_concept', 'relation_type': 'applied', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False},
            {'target': 'cognitive_bias_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False}
        ]
    },
    'arts_field': {
        'description': "The arts encompass human creative expression through visual, auditory, and performative forms including painting, music, literature, theater, and dance. Art communicates meaning and emotion in ways that transcend language and logic. Beyond aesthetics, the arts bridge into science through perspective geometry, into technology through digital media, and into psychology through the study of perception. Throughout history, they have been inseparable from religion, politics, and philosophy.",
        'new_connections': [
            {'target': 'perspective_concept', 'relation_type': 'applied', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False},
            {'target': 'aesthetic_theory_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False}
        ]
    },
    'history_field': {
        'description': "History as a discipline studies how humans reconstruct and interpret the past using evidence, sources, and critical methods. It asks not just what happened, but why it matters, how we know, and whose story is told. Historical thinking bridges across every other discipline \u2014 understanding where ideas came from is fundamental to understanding what they mean. Its methods of source criticism and periodization now inform data science, legal reasoning, and medical diagnosis.",
        'new_connections': [
            {'target': 'primary_sources_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False},
            {'target': 'periodization_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False}
        ]
    },
    'astronomy_field': {
        'description': "Astronomy studies celestial objects and phenomena \u2014 stars, planets, galaxies, and the universe as a whole. The oldest natural science, it was fundamental to the development of mathematics, navigation, and the scientific revolution. Modern astronomy bridges physics and chemistry through spectroscopy, connects to computer science via massive data processing, and transformed philosophy by revealing humanity's place in a vast, evolving cosmos.",
        'new_connections': [
            {'target': 'spectroscopy_concept', 'relation_type': 'applied', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False},
            {'target': 'cosmology_concept', 'relation_type': 'logical', 'relation': '', 'directed': False, 'learning_prerequisite': False, 'parallel_development': False, 'pending': False}
        ]
    }
}

for node in data['nodes']:
    if node['id'] in fixes:
        fix = fixes[node['id']]
        node['description'] = fix['description']
        node['connections'].extend(fix['new_connections'])

with open('data/all_nodes.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print('Fixed 5 C-grade field nodes')
