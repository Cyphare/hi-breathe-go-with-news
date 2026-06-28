# Breathe Laboratory Website

This website is built with Hugo and uses YAML files for managing its content.

## How to add or update content

All dynamic content is stored in the `data/` directory. You can edit the YAML files in this folder to update the website without touching the HTML or CSS.

### 1. News

To add a new news article, edit `data/news.yaml`. Add a new entry to the top of the list following this format:

```yaml
- title: "Your News Title"
  date: "YYYY-MM-DD"
  image: "image-filename.png" # Place the image in static/images/news/
  body: |
    Your news content goes here. 
    You can use multiple paragraphs.
    
    Like this.
```

### 2. Publications

To add a new publication, edit `data/publications.yaml`:

```yaml
- title: "Publication Title"
  authors: "Authors List"
  journal: "Journal Name"
  year: "YYYY"
  pdf: "#link-to-pdf" # Optional link
  doi: "#link-to-doi" # Optional link
```

### 3. Team Members

To add a new team member, edit `data/team.yaml`:

```yaml
- name: "Short Name"
  fullTitle: "Full Academic Title and Name"
  role: "Role in Lab"
  email: "email@example.com"
  image: "filename.png" # Place the image in static/images/team/
```

### 4. Students

To add a student, edit `data/students.yaml`:

```yaml
- name: "Full Name"
  info: "Program or Role Information"
  email: "email@example.com"
```

### 5. Research Projects

To add or update research projects, edit `data/research.yaml`. The projects are grouped by category (Electrical, Information, Biomedical).

Find the appropriate category and add a new project under its `projects:` list:

```yaml
      - label: "Project Name"
        image: "project-image.png" # Place the image in static/images/research/
```

### Images
Make sure to put any new images in their corresponding directories inside `static/images/` (e.g., `static/images/news/`, `static/images/team/`, `static/images/research/`).
