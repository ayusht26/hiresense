"""
Skill Alias Normalization & Devicon Mapping for HireSense.
Ensures consistent canonical names, devicon slugs, and categories.
"""

from typing import Dict, Tuple, Optional

# Mapping: alias_lower -> (canonical_name, devicon_slug, category)
TECH_CATALOG: Dict[str, Tuple[str, Optional[str], str]] = {
    # Frontend / Languages
    "javascript": ("JavaScript", "javascript", "frontend"),
    "js": ("JavaScript", "javascript", "frontend"),
    "typescript": ("TypeScript", "typescript", "frontend"),
    "ts": ("TypeScript", "typescript", "frontend"),
    "html": ("HTML5", "html5", "frontend"),
    "html5": ("HTML5", "html5", "frontend"),
    "css": ("CSS3", "css3", "frontend"),
    "css3": ("CSS3", "css3", "frontend"),
    "sass": ("Sass", "sass", "frontend"),
    "scss": ("Sass", "sass", "frontend"),
    "tailwind": ("Tailwind CSS", "tailwindcss", "frontend"),
    "tailwindcss": ("Tailwind CSS", "tailwindcss", "frontend"),
    "tailwind css": ("Tailwind CSS", "tailwindcss", "frontend"),
    "react": ("React", "react", "frontend"),
    "reactjs": ("React", "react", "frontend"),
    "react.js": ("React", "react", "frontend"),
    "react native": ("React Native", "react", "mobile"),
    "next": ("Next.js", "nextjs", "frontend"),
    "nextjs": ("Next.js", "nextjs", "frontend"),
    "next.js": ("Next.js", "nextjs", "frontend"),
    "vue": ("Vue.js", "vuejs", "frontend"),
    "vuejs": ("Vue.js", "vuejs", "frontend"),
    "vue.js": ("Vue.js", "vuejs", "frontend"),
    "angular": ("Angular", "angular", "frontend"),
    "angularjs": ("Angular", "angular", "frontend"),
    "svelte": ("Svelte", "svelte", "frontend"),

    # Backend / Languages
    "python": ("Python", "python", "backend"),
    "py": ("Python", "python", "backend"),
    "node": ("Node.js", "nodejs", "backend"),
    "nodejs": ("Node.js", "nodejs", "backend"),
    "node.js": ("Node.js", "nodejs", "backend"),
    "express": ("Express", "express", "backend"),
    "expressjs": ("Express", "express", "backend"),
    "express.js": ("Express", "express", "backend"),
    "fastapi": ("FastAPI", "fastapi", "backend"),
    "django": ("Django", "django", "backend"),
    "flask": ("Flask", "flask", "backend"),
    "java": ("Java", "java", "backend"),
    "spring": ("Spring Boot", "spring", "backend"),
    "spring boot": ("Spring Boot", "spring", "backend"),
    "springboot": ("Spring Boot", "spring", "backend"),
    "c++": ("C++", "cplusplus", "backend"),
    "cpp": ("C++", "cplusplus", "backend"),
    "c#": ("C#", "csharp", "backend"),
    "csharp": ("C#", "csharp", "backend"),
    ".net": (".NET", "dot-net", "backend"),
    "dotnet": (".NET", "dot-net", "backend"),
    "go": ("Go", "go", "backend"),
    "golang": ("Go", "go", "backend"),
    "rust": ("Rust", "rust", "backend"),
    "php": ("PHP", "php", "backend"),
    "ruby": ("Ruby", "ruby", "backend"),
    "rails": ("Ruby on Rails", "rails", "backend"),
    "ruby on rails": ("Ruby on Rails", "rails", "backend"),
    "graphql": ("GraphQL", "graphql", "backend"),
    "rest": ("RESTful APIs", None, "backend"),
    "rest api": ("RESTful APIs", None, "backend"),
    "grpc": ("gRPC", "grpc", "backend"),

    # Databases
    "postgres": ("PostgreSQL", "postgresql", "database"),
    "postgresql": ("PostgreSQL", "postgresql", "database"),
    "psql": ("PostgreSQL", "postgresql", "database"),
    "pg": ("PostgreSQL", "postgresql", "database"),
    "mysql": ("MySQL", "mysql", "database"),
    "mongodb": ("MongoDB", "mongodb", "database"),
    "mongo": ("MongoDB", "mongodb", "database"),
    "redis": ("Redis", "redis", "database"),
    "sqlite": ("SQLite", "sqlite", "database"),
    "elasticsearch": ("Elasticsearch", "elasticsearch", "database"),
    "supabase": ("Supabase", "supabase", "database"),
    "firebase": ("Firebase", "firebase", "database"),
    "dynamodb": ("DynamoDB", "amazonwebservices", "database"),
    "cassandra": ("Apache Cassandra", "apache", "database"),
    "sql": ("SQL", None, "database"),

    # Cloud & DevOps
    "docker": ("Docker", "docker", "devops"),
    "kubernetes": ("Kubernetes", "kubernetes", "devops"),
    "k8s": ("Kubernetes", "kubernetes", "devops"),
    "aws": ("AWS", "amazonwebservices", "devops"),
    "amazon web services": ("AWS", "amazonwebservices", "devops"),
    "gcp": ("Google Cloud", "googlecloud", "devops"),
    "google cloud": ("Google Cloud", "googlecloud", "devops"),
    "azure": ("Azure", "azure", "devops"),
    "linux": ("Linux", "linux", "devops"),
    "nginx": ("Nginx", "nginx", "devops"),
    "ci/cd": ("CI/CD", None, "devops"),
    "cicd": ("CI/CD", None, "devops"),
    "terraform": ("Terraform", "terraform", "devops"),
    "ansible": ("Ansible", "ansible", "devops"),

    # AI / ML
    "pytorch": ("PyTorch", "pytorch", "ai_ml"),
    "tensorflow": ("TensorFlow", "tensorflow", "ai_ml"),
    "tf": ("TensorFlow", "tensorflow", "ai_ml"),
    "scikit-learn": ("Scikit-learn", "scikitlearn", "ai_ml"),
    "sklearn": ("Scikit-learn", "scikitlearn", "ai_ml"),
    "pandas": ("Pandas", "pandas", "ai_ml"),
    "numpy": ("NumPy", "numpy", "ai_ml"),
    "nlp": ("NLP", None, "ai_ml"),
    "computer vision": ("Computer Vision", "opencv", "ai_ml"),
    "opencv": ("OpenCV", "opencv", "ai_ml"),
    "huggingface": ("Hugging Face", None, "ai_ml"),
    "llm": ("LLMs", None, "ai_ml"),

    # Mobile
    "flutter": ("Flutter", "flutter", "mobile"),
    "dart": ("Dart", "dart", "mobile"),
    "swift": ("Swift", "swift", "mobile"),
    "kotlin": ("Kotlin", "kotlin", "mobile"),
    "android": ("Android", "android", "mobile"),
    "ios": ("iOS", "apple", "mobile"),

    # Tools
    "git": ("Git", "git", "tools"),
    "github": ("GitHub", "github", "tools"),
    "gitlab": ("GitLab", "gitlab", "tools"),
    "jira": ("Jira", "jira", "tools"),
    "figma": ("Figma", "figma", "tools"),
    "postman": ("Postman", "postman", "tools"),
}

def normalize_tech_alias(raw_name: str, given_category: Optional[str] = None) -> Tuple[str, str, Optional[str]]:
    """
    Normalizes a skill/technology name.
    Returns: (canonical_name, category, devicon_slug)
    """
    cleaned = raw_name.strip()
    key = cleaned.lower()

    if key in TECH_CATALOG:
        canonical, devicon, cat = TECH_CATALOG[key]
        return canonical, (given_category if given_category and given_category != "other" else cat), devicon

    # Check for direct slug match by cleaning punctuation
    slug_candidate = key.replace(".", "").replace(" ", "").replace("-", "")
    if slug_candidate in TECH_CATALOG:
        canonical, devicon, cat = TECH_CATALOG[slug_candidate]
        return canonical, (given_category if given_category and given_category != "other" else cat), devicon

    return cleaned, (given_category or "other"), None

