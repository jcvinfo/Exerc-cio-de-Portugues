import { PageConfig, QuizProject, QuizQuestion } from '../types/quiz';
import { DEFAULT_QUIZ_PROJECT } from '../data/defaultQuiz';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFontStack(fontOption: PageConfig['fontOption']): string {
  switch (fontOption) {
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'jakarta':
      return '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    case 'sans':
    default:
      return 'Arial, Helvetica, sans-serif';
  }
}

function getCardRadiusPx(radius: PageConfig['cardRadius']): number {
  switch (radius) {
    case 'compact':
      return 10;
    case 'soft':
      return 24;
    case 'rounded':
    default:
      return 18;
  }
}

export function generateStandaloneHtml(project: QuizProject): string {
  const { page, questions } = project;
  const serializedQuestions = JSON.stringify(
    questions.map((item) => ({
      q: item.q,
      a: item.a,
      c: item.c,
      e: item.e,
    }))
  );

  const radiusPx = getCardRadiusPx(page.cardRadius);
  const fontStack = getFontStack(page.fontOption);
  const bulletsHtml = page.bullets
    .filter((b) => b.trim().length > 0)
    .map((b) => `      <li>${escapeHtml(b)}</li>`)
    .join('\n');

  const teacherLineParts = [page.teacherName.trim(), page.targetGroup.trim()].filter(Boolean);
  const teacherMetaHtml =
    teacherLineParts.length > 0
      ? `    <p class="meta">${escapeHtml(teacherLineParts.join(' · '))}</p>\n`
      : '';

  const messagesJson = JSON.stringify(page.resultMessages);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(page.title)}</title>
<style>
:root{--blue:${page.accentColor};--light:${page.lightTintColor};--ink:#1e293b;--green:#16834a;--red:#bd3434;--bg:${page.pageBgColor}}
*{box-sizing:border-box} body{margin:0;font-family:${fontStack};background:var(--bg);color:var(--ink);padding:20px}
main{max-width:720px;margin:30px auto;background:white;border-radius:${radiusPx}px;padding:28px;box-shadow:0 8px 28px #17255418}
h1{color:var(--blue);margin-top:0;line-height:1.2} .muted{color:#64748b;line-height:1.55}
.meta{color:#475569;font-size:14px;font-weight:600;margin:0 0 10px}
button{border:0;border-radius:10px;padding:13px 18px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}
.primary{background:var(--blue);color:white}.option{display:block;width:100%;text-align:left;background:var(--light);color:var(--ink);margin:10px 0;border:2px solid transparent}
.option:hover:not(:disabled){border-color:var(--blue)} .option:disabled{cursor:default;opacity:1}
.correct{background:#e7f7ed;border-color:var(--green)!important}.wrong{background:#fff0f0;border-color:var(--red)!important}
#feedback{padding:14px;border-radius:10px;margin:16px 0;line-height:1.5;background:#f8fafc}
#feedback.good{background:#e7f7ed}#feedback.bad{background:#fff0f0}
.top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:#475569;font-weight:700}
.progress{height:9px;background:#e2e8f0;border-radius:20px;overflow:hidden;margin:14px 0 22px}.bar{height:100%;background:var(--blue);width:0;transition:width .2s}
.hidden{display:none}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
@media(max-width:520px){body{padding:10px}main{margin:10px auto;padding:20px}h1{font-size:24px}}
</style>
</head>
<body>
<main>
  <section id="start">
${teacherMetaHtml}    <h1>${escapeHtml(page.title)}</h1>
    <p class="muted">${escapeHtml(page.subtitle)}</p>
${bulletsHtml ? `    <ul class="muted">\n${bulletsHtml}\n    </ul>\n` : ''}    <button class="primary" onclick="startQuiz()">${escapeHtml(page.startButtonLabel)}</button>
  </section>

  <section id="quiz" class="hidden">
    <div class="top"><span id="counter">Questão 1 de ${questions.length}</span><span id="score">Pontos: 0</span></div>
    <div class="progress"><div class="bar" id="bar"></div></div>
    <h2 id="question"></h2>
    <div id="options"></div>
    <div id="feedback" class="hidden" aria-live="polite"></div>
    <div class="actions"><button id="next" class="primary hidden" onclick="nextQuestion()">Próxima questão</button></div>
  </section>

  <section id="result" class="hidden">
    <h1>${escapeHtml(page.finishTitle)}</h1>
    <h2 id="finalScore"></h2>
    <p id="message" class="muted"></p>
    <button class="primary" onclick="startQuiz()">${escapeHtml(page.retryButtonLabel)}</button>
  </section>
</main>
<script>
const questions = ${serializedQuestions};
const resultMessages = ${messagesJson};
let index=0, points=0, answered=false;
function show(id){["start","quiz","result"].forEach(x=>document.getElementById(x).classList.toggle("hidden",x!==id))}
function startQuiz(){index=0;points=0;show("quiz");render()}
function render(){
 if(!questions.length)return;
 answered=false;const q=questions[index];
 document.getElementById("counter").textContent=\`Questão \${index+1} de \${questions.length}\`;
 document.getElementById("score").textContent=\`Pontos: \${points}\`;
 document.getElementById("bar").style.width=\`\${index/questions.length*100}%\`;
 document.getElementById("question").textContent=q.q;
 const area=document.getElementById("options");area.innerHTML="";
 q.a.forEach((answer,i)=>{const b=document.createElement("button");b.className="option";b.textContent=String.fromCharCode(65+i)+") "+answer;b.onclick=()=>choose(i);area.appendChild(b)});
 document.getElementById("feedback").className="hidden";
 document.getElementById("next").classList.add("hidden");
}
function choose(choice){
 if(answered)return;answered=true;const q=questions[index], buttons=[...document.querySelectorAll(".option")], fb=document.getElementById("feedback");
 buttons.forEach((b,i)=>{b.disabled=true;if(i===q.c)b.classList.add("correct");if(i===choice&&choice!==q.c)b.classList.add("wrong")});
 if(choice===q.c){points++;fb.textContent="Correta! "+q.e;fb.className="good"}else{fb.textContent="Incorreta. "+q.e;fb.className="bad"}
 document.getElementById("score").textContent=\`Pontos: \${points}\`;
 document.getElementById("next").textContent=index===questions.length-1?"Ver resultado":"Próxima questão";
 document.getElementById("next").classList.remove("hidden");
}
function nextQuestion(){
 if(index<questions.length-1){index++;render();}else{
 show("result");document.getElementById("bar").style.width="100%";
 document.getElementById("finalScore").textContent=\`Você acertou \${points} de \${questions.length} questões.\`;
 const ratio=questions.length?points/questions.length:0;
 document.getElementById("message").textContent=ratio===1?resultMessages.perfect:ratio>=0.7?resultMessages.great:ratio>=0.5?resultMessages.good:resultMessages.retry;
 }}
</script>
</body>
</html>`;
}

function normalizeQuestion(raw: unknown, index: number): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const qText = typeof obj.q === 'string' ? obj.q : typeof obj.question === 'string' ? obj.question : '';
  const optionsRaw = Array.isArray(obj.a) ? obj.a : Array.isArray(obj.options) ? obj.options : [];
  const options = optionsRaw.map((o) => String(o).trim()).filter(Boolean);
  if (!qText.trim() || options.length < 2) return null;

  let correctIndex = 0;
  if (typeof obj.c === 'number' && obj.c >= 0 && obj.c < options.length) {
    correctIndex = obj.c;
  } else if (typeof obj.correct === 'number' && obj.correct >= 0 && obj.correct < options.length) {
    correctIndex = obj.correct;
  }

  const explanation =
    typeof obj.e === 'string'
      ? obj.e
      : typeof obj.explanation === 'string'
        ? obj.explanation
        : 'Confira a alternativa marcada como correta.';

  return {
    id: typeof obj.id === 'string' ? obj.id : `imported-${Date.now()}-${index}`,
    q: qText.trim(),
    a: options,
    c: correctIndex,
    e: explanation.trim(),
  };
}

export function parsePlainTextExercises(text: string): QuizQuestion[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const parsed: QuizQuestion[] = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const lines = blocks[idx]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 3) continue;

    let questionLine = lines[0].replace(/^\d+[.)\-\s]+/, '').trim();
    const options: string[] = [];
    let correctIdx = 0;
    let explanation = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const optionMatch = line.match(/^([A-Fa-f])[).:\-]\s*(.+)$/);
      if (optionMatch) {
        let optText = optionMatch[2].trim();
        if (optText.startsWith('*') || /\(correta\)/i.test(optText)) {
          correctIdx = options.length;
          optText = optText.replace(/^\*\s*/, '').replace(/\(correta\)/gi, '').trim();
        }
        options.push(optText);
        continue;
      }

      const answerMatch = line.match(/^(?:resposta|gabarito|correta)\s*[:\-]\s*([A-Fa-f0-9])/i);
      if (answerMatch) {
        const token = answerMatch[1].toUpperCase();
        if (/[A-F]/.test(token)) {
          correctIdx = token.charCodeAt(0) - 65;
        } else {
          const num = parseInt(token, 10);
          if (!Number.isNaN(num) && num >= 1) correctIdx = num - 1;
        }
        continue;
      }

      const expMatch = line.match(/^(?:explica[çc][ãa]o|coment[áa]rio|feedback)\s*[:\-]\s*(.+)$/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }

      if (options.length === 0) {
        questionLine += ' ' + line;
      }
    }

    if (questionLine && options.length >= 2) {
      const safeCorrect = correctIdx >= 0 && correctIdx < options.length ? correctIdx : 0;
      parsed.push({
        id: `doc-q-${Date.now()}-${idx}`,
        q: questionLine,
        a: options,
        c: safeCorrect,
        e: explanation || `A alternativa correta é ${String.fromCharCode(65 + safeCorrect)}.`,
      });
    }
  }

  return parsed;
}

export function parseImportedContent(
  rawContent: string,
  fileName: string
): { project: Partial<QuizProject>; summary: string } {
  const trimmed = rawContent.trim();

  // 1. Try JSON format
  if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const questions = parsed
          .map((item, idx) => normalizeQuestion(item, idx))
          .filter((item): item is QuizQuestion => item !== null);
        if (questions.length > 0) {
          return {
            project: { questions },
            summary: `${questions.length} questões importadas de lista JSON.`,
          };
        }
      } else if (parsed && typeof parsed === 'object') {
        const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
        const questions = rawQuestions
          .map((item: unknown, idx: number) => normalizeQuestion(item, idx))
          .filter((item: QuizQuestion | null): item is QuizQuestion => item !== null);
        const page =
          parsed.page && typeof parsed.page === 'object'
            ? { ...DEFAULT_QUIZ_PROJECT.page, ...parsed.page }
            : undefined;
        return {
          project: {
            ...(page ? { page } : {}),
            ...(questions.length > 0 ? { questions } : {}),
          },
          summary: `${questions.length} questões e configurações da página importadas.`,
        };
      }
    } catch {
      // Fall through to HTML/Text parsing
    }
  }

  // 2. Try HTML quiz format (compatible with desafio_lingua_portuguesa_d8427771.html)
  if (fileName.toLowerCase().endsWith('.html') || trimmed.toLowerCase().includes('<html')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const title = doc.querySelector('#start h1')?.textContent?.trim() || doc.title?.trim();
    const subtitle = doc.querySelector('#start p.muted')?.textContent?.trim();
    const metaText = doc.querySelector('#start p.meta')?.textContent?.trim();
    const bullets = Array.from(doc.querySelectorAll('#start ul li'))
      .map((li) => li.textContent?.trim() || '')
      .filter(Boolean);
    const startButtonLabel = doc.querySelector('#start button')?.textContent?.trim();
    const finishTitle = doc.querySelector('#result h1')?.textContent?.trim();
    const retryButtonLabel = doc.querySelector('#result button')?.textContent?.trim();

    let accentColor: string | undefined;
    const blueMatch = trimmed.match(/--blue\s*:\s*(#[0-9a-fA-F]{3,8})/);
    if (blueMatch) accentColor = blueMatch[1];

    let lightTintColor: string | undefined;
    const lightMatch = trimmed.match(/--light\s*:\s*(#[0-9a-fA-F]{3,8})/);
    if (lightMatch) lightTintColor = lightMatch[1];

    let questions: QuizQuestion[] = [];
    const qMatch = trimmed.match(/const\s+questions\s*=\s*(\[[\s\S]*?\]);/);
    if (qMatch) {
      try {
        // Safe evaluation of literal JS array from teacher HTML quiz
        const fn = new Function(`return (${qMatch[1]});`);
        const rawArr = fn();
        if (Array.isArray(rawArr)) {
          questions = rawArr
            .map((item, idx) => normalizeQuestion(item, idx))
            .filter((item): item is QuizQuestion => item !== null);
        }
      } catch {
        questions = [];
      }
    }

    const [teacherName, targetGroup] = metaText
      ? metaText.split('·').map((s) => s.trim())
      : [undefined, undefined];

    if (questions.length > 0 || title) {
      return {
        project: {
          page: {
            ...DEFAULT_QUIZ_PROJECT.page,
            ...(title ? { title } : {}),
            ...(subtitle ? { subtitle } : {}),
            ...(teacherName ? { teacherName } : {}),
            ...(targetGroup ? { targetGroup } : {}),
            ...(bullets.length > 0 ? { bullets } : {}),
            ...(startButtonLabel ? { startButtonLabel } : {}),
            ...(finishTitle ? { finishTitle } : {}),
            ...(retryButtonLabel ? { retryButtonLabel } : {}),
            ...(accentColor ? { accentColor } : {}),
            ...(lightTintColor ? { lightTintColor } : {}),
          },
          ...(questions.length > 0 ? { questions } : {}),
        },
        summary: `Página HTML importada com ${questions.length} questões.`,
      };
    }
  }

  // 3. Fallback: Parse structured Google Doc / plain text exercises
  const textQuestions = parsePlainTextExercises(trimmed);
  if (textQuestions.length > 0) {
    return {
      project: { questions: textQuestions },
      summary: `${textQuestions.length} questões extraídas do documento de texto.`,
    };
  }

  throw new Error(
    'Não foi possível reconhecer questões neste arquivo. Utilize JSON, HTML do estúdio ou texto estruturado (1. Pergunta / A) ... / Resposta: A / Explicação: ...).'
  );
}
