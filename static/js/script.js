

// ----- CONTENT (AI Engineer) -----
const CONTENT = {
  name: "Ahmed Shaikh",
  role: "AI Engineer • LLMs & Computer Vision • MLOps",
  bio:
    "I design, train, and ship AI systems—LLMs, agents, and vision models—optimized for real-world latency, accuracy, and cost. I turn research into reliable products with clean APIs, strong guardrails, and rigorous evaluation.",
  photo: "/static/images/photo.jpg",


  skills: [
    { name: "Python", level: 90 },
    { name: "PyTorch / TensorFlow", level: 85 },
    { name: "LLMs (prompting, RAG, fine-tune)", level: 88 },
    { name: "Computer Vision (YOLOv8, SAM, Diffusion)", level: 82 },
    { name: "FastAPI / REST APIs", level: 86 },
    { name: "Vector DBs (FAISS, Pinecone, Chroma)", level: 80 },
    { name: "LangChain / LlamaIndex / Agents", level: 78 },
    { name: "MLOps (Docker, CI/CD, DVC, MLflow)", level: 76 },
    { name: "Cloud & Deploy (AWS/GCP, K8s)", level: 72 },
    { name: "TypeScript + React demos", level: 65 },
  ],

  timeline: [
    {
      title: "AI Engineer",
      org: "Applied Intelligence Lab",
      date: "2024 – Present",
      desc:
        "Built RAG pipelines with evals & guardrails, fine-tuned adapters, and shipped FastAPI services on autoscaling GPUs.",
    },
    {
      title: "Computer Vision Engineer",
      org: "VisionX",
      date: "2022 – 2024",
      desc:
        "Segmentation/detection (YOLOv8, SAM) with real-time inference via Triton, ONNX, TensorRT; latency & cost tuning.",
    },
    {
      title: "B.Tech, CSE",
      org: "Tech University",
      date: "2018 – 2022",
      desc: "Specialized in ML systems, IR, and distributed training.",
    },
  ],

  projects: [
    {
      title: "NeonCut — Background Removal API",
      desc:
        "Production matting with hybrid U-Net + Transformer and alpha refinement. FastAPI, ONNX/TensorRT inference.",
      link: "https://example.com/neoncut",
      tags: ["CV", "Segmentation", "FastAPI", "TensorRT"],
      image:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
    },
    {
      title: "AstraRAG — LLM Retrieval System",
      desc:
        "Hybrid search (BM25 + vector), structured prompts/JSON mode, guardrails (Pydantic), and eval harness (LLM-as-judge).",
      link: "https://example.com/astrarag",
      tags: ["LLM", "RAG", "FAISS", "Guardrails"],
      image:
        "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop",
    },
    {
      title: "VisionOps — Serving & Observability",
      desc:
        "Dockerized CV models on Triton; drift, cost, latency dashboards; canary deploys via GitHub Actions & Helm.",
      link: "https://example.com/visionops",
      tags: ["MLOps", "Triton", "Grafana", "K8s"],
      image:
        "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?q=80&w=1200&auto=format&fit=crop",
    },
    {
      title: "AgentSmith — Tool-Using LLM Agent",
      desc:
        "Multi-tool agent (search/code/DB) with memory & function calling; timeouts, retries, and self-consistency.",
      link: "https://example.com/agentsmith",
      tags: ["Agents", "Functions", "LangChain", "Eval"],
      image:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop",
    },
  ],

  posts: [
    {
      title: "RAG That Doesn’t Hallucinate: Guardrails & Evals",
      date: "Aug 2025",
      excerpt:
        "Retrieval filters, structured outputs, and regression tests that actually cut hallucinations.",
      link: "#",
    },
    {
      title: "Fast Background Matting on GPU: From U-Net to TensorRT",
      date: "Jul 2025",
      excerpt:
        "Half-precision, dynamic shapes, and post-processing for clean alphas and low latency.",
      link: "#",
    },
    {
      title: "LLM Agents in Prod: Timeouts, Retries, & Tooling",
      date: "May 2025",
      excerpt:
        "Patterns that keep tool-using agents from getting stuck—and how to observe them.",
      link: "#",
    },
  ],

  email: "ahmed@example.com",
  socials: {
    github: "https://github.com/yourhandle",
    linkedin: "https://linkedin.com/in/yourhandle",
    twitter: "https://twitter.com/yourhandle",
  },
};

// ----- Preloader -----
window.addEventListener("load", () => {
  setTimeout(() => {
    const pre = document.getElementById("preloader");
    pre.style.opacity = "0";
    pre.style.pointerEvents = "none";
  }, 1200);
});

// ----- Theme toggle (persist) -----
const htmlEl = document.documentElement;
const toggleBtn = document.getElementById("dark-toggle");
const iconSun = document.getElementById("icon-sun");
const iconMoon = document.getElementById("icon-moon");

function isDark() { return htmlEl.classList.contains("dark"); }
function setTheme(dark) {
  htmlEl.classList.toggle("dark", dark);
  iconSun.classList.toggle("hidden", !dark);
  iconMoon.classList.toggle("hidden", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
}
setTheme(isDark());
toggleBtn.addEventListener("click", () => setTheme(!isDark()));

// ----- Fill content -----
document.getElementById("brand-name").textContent = CONTENT.name;
document.getElementById("name").textContent = CONTENT.name;
document.getElementById("role").textContent = CONTENT.role;
document.getElementById("bio").textContent = CONTENT.bio;
document.getElementById("about-text").textContent =
  CONTENT.bio + " I care about evals, safety, and clean abstractions that make models maintainable.";
document.getElementById("photo").src = CONTENT.photo;
document.getElementById("photo").alt = CONTENT.name;
document.getElementById("email").textContent = CONTENT.email;
document.getElementById("email").href = `mailto:${CONTENT.email}`;
document.getElementById("footer-name").textContent = CONTENT.name;
document.getElementById("year").textContent = new Date().getFullYear();

["github", "linkedin", "twitter", "github2", "linkedin2", "twitter2"].forEach(id => {
  const key = id.replace(/[2]$/, "");
  const el = document.getElementById(id);
  if (el && CONTENT.socials[key]) el.href = CONTENT.socials[key];
});

// ----- Skills -----
const skillsGrid = document.getElementById("skills-grid");
CONTENT.skills.forEach(s => {
  const wrap = document.createElement("div");
  wrap.className = "glass p-5 reveal";
  wrap.innerHTML = `
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm text-zinc-700 dark:text-white/70">
        <span>${s.name}</span><span>${s.level}%</span>
      </div>
      <div class="skill-track"><div class="skill-fill" style="width:0%"></div></div>
    </div>
  `;
  skillsGrid.appendChild(wrap);
});

// ----- Projects -----
const projectsGrid = document.getElementById("projects-grid");
CONTENT.projects.forEach(p => {
  const a = document.createElement("a");
  a.href = p.link; a.target = "_blank"; a.rel = "noreferrer";
  a.className = "group relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/70 backdrop-blur-xl transition-shadow card-hover reveal dark:border-white/10 dark:bg-white/5";
  a.innerHTML = `
    <div class="relative aspect-[16/10] overflow-hidden">
      <img src="${p.image}" alt="${p.title}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent dark:from-black/60"></div>
    </div>
    <div class="p-5">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">${p.title}</h3>
      <p class="mt-1 text-sm text-zinc-700 dark:text-white/70">${p.desc}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        ${p.tags.map(t => `<span class="rounded-full border border-zinc-900/10 bg-white/80 px-2 py-1 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70">${t}</span>`).join("")}
      </div>
    </div>
  `;
  projectsGrid.appendChild(a);
});

// ----- Timeline -----
// const timeline = document.getElementById("timeline-wrap");
// CONTENT.timeline.forEach(item => {
//   const box = document.createElement("div");
//   box.className = "relative pl-8 reveal";
//   box.innerHTML = `
//     <div class="timeline-line"></div>
//     <div class="timeline-dot"></div>
//     <div class="glass p-5">
//       <div class="flex flex-wrap items-center justify-between gap-2">
//         <div class="text-zinc-900 dark:text-white">
//           <div class="text-sm uppercase tracking-wider text-zinc-600 dark:text-white/60">${item.date}</div>
//           <div class="mt-1 text-lg font-semibold">${item.title}</div>
//           <div class="text-zinc-700 dark:text-white/70">${item.org}</div>
//         </div>
//       </div>
//       <p class="mt-3 text-zinc-700 dark:text-white/70">${item.desc}</p>
//     </div>
//   `;
//   timeline.appendChild(box);
// });

// ----- Blog -----
const postsGrid = document.getElementById("posts-grid");
CONTENT.posts.forEach(post => {
  const card = document.createElement("a");
  card.href = post.link;
  card.className = "group relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-white/70 p-5 backdrop-blur-xl transition-shadow card-hover reveal dark:border-white/10 dark:bg-white/5";
  card.innerHTML = `
    <div class="flex items-center justify-between text-sm text-zinc-600 dark:text-white/60">
      <span>${post.date}</span>
      <span class="rounded-full border border-zinc-900/10 bg-white/80 px-2 py-1 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70">Read</span>
    </div>
    <h3 class="mt-3 text-lg font-semibold text-zinc-900 dark:text-white">${post.title}</h3>
    <p class="mt-1 text-zinc-700 dark:text-white/70">${post.excerpt}</p>
  `;
  postsGrid.appendChild(card);
});

// ----- Contact form (demo) -----
document.getElementById("contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Thanks! This demo form doesn't send yet.");
});

// ----- Scroll progress -----
const progress = document.getElementById("progress");
window.addEventListener("scroll", () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
  progress.style.width = (scrolled * 100) + "%";
});

// ----- Neon aura follows pointer -----
const cursor = document.getElementById("neon-cursor");
window.addEventListener("pointermove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});

// ----- Reveal on scroll -----
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      entry.target.querySelectorAll(".skill-fill").forEach((el) => {
        const percentText = entry.target.querySelector(".flex > span:last-child");
        const percent = parseInt(percentText?.textContent || "0", 10);
        el.style.width = percent + "%";
      });
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.2, rootMargin: "0px 0px -80px 0px" });

document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// ----- Particle background -----
(function particleBG() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let dpr = window.devicePixelRatio || 1;

  const particles = Array.from({ length: 70 }).map(() => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 0.5,
    a: Math.random() * Math.PI * 2,
  }));

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function loop() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const g = ctx.createRadialGradient(
      window.innerWidth * 0.6, window.innerHeight * 0.4, 50,
      window.innerWidth * 0.6, window.innerHeight * 0.4,
      Math.max(window.innerWidth, window.innerHeight)
    );
    g.addColorStop(0, "rgba(99,102,241,0.10)");
    g.addColorStop(0.4, "rgba(14,165,233,0.08)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.a += 0.01;
      p.x += Math.cos(p.a) * 0.1;
      p.y += Math.sin(p.a) * 0.1;
      if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(236,72,153,0.35)";
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(56,189,248,${1 - dist / 120})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
