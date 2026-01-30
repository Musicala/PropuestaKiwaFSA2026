/* ============================================================================
  app.js — Propuesta Casas Kiwa · Musicala (Light App)
  - Render desde data/propuesta.json
  - Navegación tipo app
  - Tablas (horas, equipo)
  - Modal evidencias
  - Anexo TSV con búsqueda sin tildes
============================================================================ */

'use strict';

const DATA_URL = './data/propuesta.json';

// Forzar periodo visible (presentación 2026)
const FORCE_YEAR = 2026;

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function toCOP(n){
  const v = Number(n||0);
  return v.toLocaleString('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 });
}

function norm(str){
  return String(str||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();
}

function sum(arr){ return arr.reduce((a,b)=>a+Number(b||0),0); }

function download(filename, text){
  const blob = new Blob([text], {type:'application/json;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}


function toast(msg, sub=''){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<div>${esc(msg)}</div>${sub?`<small>${esc(sub)}</small>`:''}`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; }, 2200);
  setTimeout(()=>{ el.remove(); }, 2600);
}

function makeKpi(k, v, s){
  return `<div class="kpi"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div><div class="s">${esc(s||'')}</div></div>`;
}

function table(headers, rows, opts={}){
  const { numericCols=[] } = opts;
  const th = headers.map(h=>`<th>${esc(h)}</th>`).join('');
  const body = rows.map(r=>{
    const tds = r.map((cell, idx)=>{
      const cls = numericCols.includes(idx) ? 'num' : '';
      return `<td class="${cls}">${cell}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<div class="tableWrap"><table class="table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ----------------- Views ----------------- */


function viewArtes(d){
  return `
    <section class="page">
      <div class="page-head">
        <h2>Artes y Metodologías por disciplina</h2>
        <p class="muted">Qué trabajamos y cómo garantizamos participación real de NNA por ciclos.</p>
      </div>
      <div id="artes-root" class="cards"></div>
    </section>
  `;
}

function viewAplicativos(d){
  return `
    <section class="page">
      <div class="page-head">
        <h2>Aplicativos del proyecto</h2>
        <p class="muted">Herramientas creadas para seguimiento, evidencia y operación (acceso rápido).</p>
      </div>
      <div id="aplicativos-root"></div>
    </section>
  `;
}


function viewResumen(d){
  const bullets = d.resumen_ejecutivo?.map(x=>`<li>${esc(x)}</li>`).join('') || '';
  const areas = d.meta.areas.map(a=>`<span class="tag">${esc(a)}</span>`).join('');
  const ciclos = d.meta.ciclos.map(c=>`<span class="tag">Ciclo ${esc(c.id)} · ${esc(c.rango)}</span>`).join('');

  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Resumen ejecutivo</div>
        <ul class="p" style="margin:0; padding-left:18px">${bullets}</ul>
      </div>
      <div class="box">
        <div class="h2">Alcance</div>
        <p class="p">Áreas:</p>
        <div>${areas}</div>
        <p class="p" style="margin-top:10px">Ciclos:</p>
        <div>${ciclos}</div>
      </div>
    </div>

    <div class="grid2" style="margin-top:12px">
      <div class="box">
        <div class="h2">Objetivo general</div>
        <p class="p">Diseñar e implementar un programa de formación artística integral que impacte positivamente el desarrollo de NNA de los Centros Redes, fortaleciendo habilidades artísticas, disciplina, trabajo en equipo, confianza y sentido de pertenencia comunitaria.</p>
      </div>
      <div class="box">
        <div class="h2">Diagnóstico inicial</div>
        <p class="p">Se realiza una línea base por centro y por ciclo (intereses, nivel, necesidades pedagógicas y dinámicas grupales) mediante actividades lúdicas, encuestas breves y entrevistas con líderes.</p>
      </div>
    </div>
  `;
}

function viewCobertura(d){
  const centros = d.meta.centros.map(c=>`<span class="tag">${esc(c)}</span>`).join('');
  const horas = d.operacion.horas.semanales_por_centro;
  const rows = Object.keys(horas).map(k=>[esc(k), `<span class="badge info">${esc(horas[k])} h/sem</span>`]);
  const tbl = table(['Centro','Horas semanales (docencia programada)'], rows);

  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Centros cubiertos</div>
        <p class="p">Cobertura directa estimada: <b>${esc(d.meta.nna_estimado)}</b> NNA (estimado).</p>
        <div>${centros}</div>
      </div>
      <div class="box">
        <div class="h2">Cobertura operativa</div>
        <p class="p">La cobertura se gestiona con rotación y asignación estable de docentes por área, coordinaciones permanentes y supervisión bimensual con actas y planes de mejora.</p>
      </div>
    </div>
    <div style="margin-top:12px">${tbl}</div>
  `;
}


function viewMetodologia(d){
  const cards = d.metodologia.pilares.map(p=>`
    <div class="box">
      <div class="h2">${esc(p.nombre)}</div>
      <p class="p">${esc(p.descripcion)}</p>
    </div>
  `).join('');

  const recursos = (d.metodologia.recursos||[]).map(r=>`<li>${esc(r)}</li>`).join('');

  const enfoques = (d.metodologia.enfoques_transversales||[]).map(e=>{
    const pts = (e.puntos||[]).map(x=>`<li>${esc(x)}</li>`).join('');
    return `
      <div class="box">
        <div class="h2">${esc(e.nombre)}</div>
        <ul class="p" style="margin:0; padding-left:18px">${pts}</ul>
      </div>
    `;
  }).join('');

  const protocolos = (d.metodologia.protocolos_socioemocionales||[]).map(x=>`<li>${esc(x)}</li>`).join('');

  return `
    <div class="grid2">
      <div class="box accent">
        <div class="h2">Metodología ${esc(d.metodologia.nombre)}</div>
        <p class="p">Nuestra metodología CREA se complementa con prácticas socioemocionales y un enfoque sensible al contexto para acompañar NNA en situaciones de vulnerabilidad. El objetivo es que el arte sea aprendizaje, contención, convivencia y proyecto de vida.</p>
      </div>
      <div class="box">
        <div class="h2">Recursos e innovación</div>
        <ul class="p" style="margin:0; padding-left:18px">${recursos}</ul>
      </div>
    </div>

    <div class="grid2" style="margin-top:12px">${cards}</div>

    <div class="sectionTitle" style="margin-top:14px">Enfoques transversales (NNA · vulnerabilidad · gestión emocional)</div>
    <div class="grid2" style="margin-top:10px">${enfoques || '<div class="box"><p class="p">—</p></div>'}</div>

    <div class="sectionTitle" style="margin-top:14px">Protocolos socioemocionales en sesión</div>
    <div class="box">
      <ul class="p" style="margin:0; padding-left:18px">${protocolos || '<li>—</li>'}</ul>
    </div>
  `;
}


function viewHoras(d){
  const h = d.operacion.horas;
  const semanalRows = Object.entries(h.semanales_por_centro).map(([c,val])=>[esc(c), val]);
  const semanalTbl = table(['Centro','Horas/sem'], semanalRows.map(r=>[r[0], `<span class="badge info">${esc(r[1])}</span>`]));

  const mensual = h.mensuales_totales;
  const mensualRows = Object.entries(mensual).map(([mes,hrs])=>[esc(mes), hrs, `<span class="badge info">${esc(hrs)} h</span>`]);
  const mensualTbl = table(['Mes','Horas totales',''], mensualRows, { numericCols:[1] });

  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Base semanal</div>
        <p class="p">Docencia programada por centro (base): <b>${esc(h.total_semanal_base)}</b> horas/semana.</p>
        <p class="p">El modelo mensual es global e incluye, además de docencia, planeación, reuniones, informes, muestras, traslados y seguimiento en aplicativos.</p>
      </div>
      <div class="box">
        <div class="h2">Variación mensual</div>
        <p class="p">Las horas totales cambian por semanas completas y días adicionales. La tarifa mensual global da estabilidad y continuidad a la operación.</p>
      </div>
    </div>

    <div class="grid2" style="margin-top:12px">
      <div class="box">${semanalTbl}</div>
      <div class="box">${mensualTbl}</div>
    </div>
  `;
}

function viewEquipo(d){
  const docRows = d.equipo.docentes
    .filter(x=>x.activo)
    .map(x=>[
      esc(x.id),
      esc(x.nombre),
      `<span class="badge info">${esc(x.area)}</span>`,
      `<span class="badge">${esc(x.horas_sem)} h/sem</span>`,
      `<span class="badge ok">${esc(toCOP(x.pago_base))}</span>`
    ]);

  const opsRows = d.equipo.operativos
    .filter(x=>x.activo)
    .map(x=>[
      esc(x.id),
      esc(x.nombre),
      `<span class="badge info">${esc(x.rol)}</span>`,
      `<span class="badge">${esc(x.horas_sem)} h/sem</span>`,
      `<span class="badge ok">${esc(toCOP(x.pago_base))}</span>`
    ]);
  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Equipo docente</div>
        <p class="p">Docentes especializados por disciplina, con experiencia en formación artística infantil y juvenil, y alineados con la metodología CREA.</p>
        ${docTbl}
      </div>
      <div class="box">
        <div class="h2">Equipo operativo</div>
        <p class="p">Coordinaciones, atención permanente y supervisión bimensual para asegurar calidad, continuidad, trazabilidad e informes mensuales.</p>
        ${opsTbl}
      </div>
    </div>
    <div class="box" style="margin-top:12px">
      <div class="h2">Modelo de roles (qué hace quién)</div>
      <div class="grid2">
        <div class="box">
          <div class="h2">Coordinación académica</div>
          <ul class="p" style="margin:0; padding-left:18px">
            <li>Diseño pedagógico por ciclos y disciplina</li>
            <li>Observación, retroalimentación y ajustes metodológicos</li>
            <li>Consolidación de evidencias y avances</li>
            <li>Planificación de muestras y cierre</li>
          </ul>
        </div>
        <div class="box">
          <div class="h2">Coordinación administrativa</div>
          <ul class="p" style="margin:0; padding-left:18px">
            <li>Contratos, pagos, soportes y trazabilidad administrativa</li>
            <li>Programación y logística con líderes</li>
            <li>Gestión documental y novedades operativas</li>
            <li>Soporte operativo al equipo docente</li>
          </ul>
        </div>
        <div class="box">
          <div class="h2">Atención y asesoría</div>
          <ul class="p" style="margin:0; padding-left:18px">
            <li>Canal permanente de respuesta y coordinación</li>
            <li>Gestión de novedades y confirmaciones</li>
            <li>Puente entre centros y equipo Musicala</li>
            <li>Soporte al seguimiento en aplicativos</li>
          </ul>
        </div>
        <div class="box">
          <div class="h2">Supervisión bimensual</div>
          <ul class="p" style="margin:0; padding-left:18px">
            <li>Visitas por centro + checklist de calidad</li>
            <li>Actas con líderes y planes de mejora</li>
            <li>Verificación en siguiente visita</li>
            <li>Reporte de hallazgos para ajustes oportunos</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

function viewFinanzas(d){
  const f = d.finanzas;
  const total = f.total_estimado;

  const incl = d.operacion.incluye.map(x=>`<li>${esc(x)}</li>`).join('');
  const excl = d.operacion.no_incluye.map(x=>`<li>${esc(x)}</li>`).join('');

  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Tarifa mensual global</div>
        <div class="grid2">
          <div class="box">
            <div class="h2">Mensual</div>
            <p class="p"><span class="badge ok">${esc(toCOP(f.tarifa_mensual))}</span></p>
          </div>
          <div class="box">
            <div class="h2">Total (${esc(f.meses)} meses)</div>
            <p class="p"><span class="badge info">${esc(toCOP(total))}</span></p>
          </div>
        </div>
        <p class="p" style="margin-top:10px">${esc(f.explicacion?.[0]||'')}</p>
        <p class="p">${esc(f.explicacion?.[1]||'')}</p>
      </div>
      <div class="box">
        <div class="h2">Cronograma de pago</div>
        <p class="p"><b>Periodicidad:</b> ${esc(f.cronograma_pago.periodicidad)}</p>
        <p class="p"><b>Fecha límite:</b> día ${esc(f.cronograma_pago.fecha_limite_dia)} de cada mes</p>
        <p class="p">${esc(f.cronograma_pago.soporte)}</p>
      </div>
    </div>

    <div class="grid2" style="margin-top:12px">
      <div class="box">
        <div class="h2">Incluye</div>
        <ul class="p" style="margin:0; padding-left:18px">${incl}</ul>
      </div>
      <div class="box">
        <div class="h2">No incluye (si aplica)</div>
        <ul class="p" style="margin:0; padding-left:18px">${excl}</ul>
      </div>
    </div>
  `;
}

function viewMonitoreo(d){
  const ev = d.operacion.evaluacion_monitoreo;
  const inst = ev.instrumentos.map(x=>`<li>${esc(x)}</li>`).join('');
  const reps = ev.reportes.map(x=>`<li>${esc(x)}</li>`).join('');

  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Instrumentos</div>
        <ul class="p" style="margin:0; padding-left:18px">${inst}</ul>
      </div>
      <div class="box">
        <div class="h2">Reportes</div>
        <ul class="p" style="margin:0; padding-left:18px">${reps}</ul>
        <p class="p" style="margin-top:10px"><b>Supervisión bimensual:</b> ${esc(ev.supervision_bimensual)}</p>
      </div>
    </div>
    <div class="box" style="margin-top:12px">
      <div class="h2">Seguimiento en aplicativos</div>
      <p class="p">Se consolida asistencia, evidencias, observaciones, compromisos y métricas en aplicativos que permiten seguimiento en tiempo real y trazabilidad de decisiones y acciones por centro.</p>
    </div>
  `;
}

function viewAnexos(d){
  return `
    <div class="grid2">
      <div class="box">
        <div class="h2">Anexo: Horario publicado (TSV)</div>
        <p class="p">Puedes abrir el anexo y cargar el TSV directamente desde el link público. Incluye buscador sin sensibilidad a tildes.</p>
        <button class="btn" id="btnOpenTSV" type="button">Abrir anexo TSV</button>
      </div>
      <div class="box">
        <div class="h2">Link TSV</div>
        <p class="p" style="word-break:break-all">${esc(d.anexos.tsv_horario_url)}</p>
      </div>
    </div>
  `;
}

/* ----------------- TSV Loader ----------------- */
async function fetchTSV(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error('No se pudo cargar el TSV');
  return await res.text();
}
function parseTSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if(!lines.length) return {headers:[], rows:[]};
  const rows = lines.map(l=>l.split('\t'));
  const headers = rows.shift();
  return { headers, rows };
}
function renderTSVTable(tableEl, headers, rows){
  const thead = `<thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  tableEl.innerHTML = `${thead}<tbody>${body}</tbody>`;
}
function filterRows(headers, rows, q){
  const nq = norm(q);
  if(!nq) return rows;
  return rows.filter(r=>{
    const joined = r.join(' | ');
    return norm(joined).includes(nq);
  });
}

/* ----------------- App ----------------- */

let STATE = { data:null, view:'resumen', tsv:{ headers:[], rows:[], loaded:false } };

function setStatus(txt){
  $('#pillStatus').textContent = txt;
}


function patchYear(d){
  try{
    if(!d?.meta?.periodo) return;
    const p = d.meta.periodo;
    const repl = (v)=>String(v||'').replace(/2025/g, String(FORCE_YEAR));
    p.inicio = repl(p.inicio);
    p.fin = repl(p.fin);
    if(typeof p.meses === 'string') p.meses = p.meses; // no-op, por si acaso
    // También ajustar textos sueltos por si quedaron hardcodeados
    d.meta.titulo = String(d.meta.titulo||'').replace(/2025/g, String(FORCE_YEAR));
    d.meta.subtitulo = String(d.meta.subtitulo||'').replace(/2025/g, String(FORCE_YEAR));
  }catch(e){}
}

function setHero(d){
  $('#h1Titulo').textContent = d.meta.titulo;
  $('#pSubtitulo').textContent = d.meta.subtitulo;

  $('#miniPeriodo').textContent = `${d.meta.periodo.inicio} → ${d.meta.periodo.fin}`;
  $('#miniAreas').textContent = d.meta.areas.join(', ');
  $('#miniCentros').textContent = String(d.meta.centros.length);

  const kpiHtml = [
    makeKpi('Periodo', `${d.meta.periodo.meses} meses`, `${d.meta.periodo.inicio} → ${d.meta.periodo.fin}`),
    makeKpi('Tarifa mensual', toCOP(d.finanzas.tarifa_mensual), 'Modelo global (operación + docencia)'),
    makeKpi('Horas base', `${d.operacion.horas.total_semanal_base} h/sem`, 'Docencia programada por centro')
  ].join('');
  $('#kpis').innerHTML = kpiHtml;
}

function renderView(){
  const d = STATE.data;
  const viewEl = $('#view');
  const v = STATE.view;

  const map = {
    artes: ()=>viewArtes(d),
    aplicativos: ()=>viewAplicativos(d),
resumen: ()=>viewResumen(d),
    cobertura: ()=>viewCobertura(d),
    metodologia: ()=>viewMetodologia(d),
    horas: ()=>viewHoras(d),
    equipo: ()=>viewEquipo(d),
    finanzas: ()=>viewFinanzas(d),
    monitoreo: ()=>viewMonitoreo(d),
    anexos: ()=>viewAnexos(d),
  };
  viewEl.innerHTML = map[v] ? map[v]() : viewResumen(d);

  // Render dynamic sections
  if(v==='artes') renderArtes(STATE);
  if(v==='aplicativos') renderAplicativos(STATE);


  // Wire dynamic buttons inside views
  const btnOpenTSV = $('#btnOpenTSV', viewEl);
  if(btnOpenTSV){
    btnOpenTSV.addEventListener('click', ()=> $('#modalTSV').showModal());
  }
}

function wireNav(){
  $$('.navItem').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.navItem').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      STATE.view = btn.dataset.view;
      renderView();
    });
  });
}

function wireTopActions(){
  $('#btnPrint').addEventListener('click', ()=>window.print());

  $('#btnDownloadJson').addEventListener('click', ()=>{
    download('propuesta.json', JSON.stringify(STATE.data, null, 2));
  });

  $('#btnOpenEvidencias').addEventListener('click', ()=>{
    const list = $('#evidenciasList');
    const vids = STATE.data?.evidencias?.videos || [];
    list.innerHTML = `<div class="linkList">${
      vids.map(v=>`
        <div class="linkCard">
          <a href="${esc(v.url)}" target="_blank" rel="noreferrer">${esc(v.titulo)}</a>
          <div class="sub">${esc(v.url)}</div>
        </div>
      `).join('')
    }</div>`;
    $('#modalEvidencias').showModal();
  });
}

function wireTSV(){
  const modal = $('#modalTSV');
  const btn = $('#btnLoadTSV');
  const tableEl = $('#tsvTable');
  const qEl = $('#tsvQuery');
  const hint = $('#tsvHint');

  async function load(){
    try{
      hint.textContent = 'Cargando…';
      const url = STATE.data.anexos.tsv_horario_url;
      const text = await fetchTSV(url);
      const parsed = parseTSV(text);
      STATE.tsv.headers = parsed.headers;
      STATE.tsv.rows = parsed.rows;
      STATE.tsv.loaded = true;
      hint.textContent = `Listo: ${parsed.rows.length} filas.`;
      renderTSVTable(tableEl, parsed.headers, parsed.rows);
    }catch(err){
      hint.textContent = 'No se pudo cargar el TSV. Revisa el link o permisos.';
      tableEl.innerHTML = '';
      console.error(err);
    }
  }

  btn.addEventListener('click', load);

  qEl.addEventListener('input', ()=>{
    if(!STATE.tsv.loaded) return;
    const rows = filterRows(STATE.tsv.headers, STATE.tsv.rows, qEl.value);
    renderTSVTable(tableEl, STATE.tsv.headers, rows);
    hint.textContent = `Mostrando ${rows.length} filas de ${STATE.tsv.rows.length}.`;
  });

  // Clear query when closing
  modal.addEventListener('close', ()=>{
    qEl.value = '';
    if(STATE.tsv.loaded){
      renderTSVTable(tableEl, STATE.tsv.headers, STATE.tsv.rows);
      hint.textContent = `Listo: ${STATE.tsv.rows.length} filas.`;
    }else{
      hint.textContent = 'Se cargará desde el link público.';
    }
  });
}

async function init(){
  try{
    setStatus('Cargando…');
    const res = await fetch(DATA_URL, {cache:'no-store'});
    if(!res.ok) throw new Error('No se pudo cargar propuesta.json');
    const d = await res.json();
    STATE.data = d;

    patchYear(d);
    setHero(d);
    setStatus('OK');

    wireNav();
    wireTopActions();
    wireTSV();
    renderView();
  }catch(err){
    setStatus('Error');
    $('#view').innerHTML = `<div class="box"><div class="h2">Ups.</div><p class="p">No pudimos cargar <b>data/propuesta.json</b>. Revisa que exista y que el servidor lo esté sirviendo.</p></div>`;
    console.error(err);
  }
}

init();


function renderArtes(state){
  const root = document.getElementById('artes-root');
  if(!root) return;

  const artes = (state?.data?.artes)||[];
  const iconFor = (name='')=>{
    const n = norm(name);
    if(n.includes('danza')) return '💃';
    if(n.includes('teatro')) return '🎭';
    if(n.includes('dibujo') || n.includes('arte') || n.includes('visual')) return '🎨';
    if(n.includes('musica')) return '🎵';
    return '✨';
  };

  const pills = (items)=>items.map(x=>`<span class="pill">${esc(x)}</span>`).join('');

  root.classList.add('cards');
  root.innerHTML = artes.map(a=>`
    <article class="artCard">
      <header class="artHead">
        <div class="artTitle">
          <div class="artIcon" aria-hidden="true">${iconFor(a.nombre||'')}</div>
          <div>
            <h3>${esc(a.nombre||'')}</h3>
            <p>${esc(a.proposito||'')}</p>
          </div>
        </div>
      </header>

      <div class="artGrid">
        <section class="artMini">
          <h4>Ejes de trabajo</h4>
          <ul>
            ${(a.ejes||[]).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>—</li>'}
          </ul>
        </section>

        <section class="artMini">
          <h4>Metodologías (participación NNA)</h4>
          <ul>
            ${(a.metodologias_participacion||[]).map(x=>`<li>${esc(x)}</li>`).join('') || '<li>—</li>'}
          </ul>
        </section>
      </div>

      <section class="artMini" style="margin-top:12px">
        <h4>Productos y evidencias</h4>
        <div class="artPills">${pills(a.productos_evidencias||[]) || '<span class="muted">—</span>'}</div>
      </section>
    </article>
  `).join('') || `<div class="box"><p class="p">No hay artes configuradas en el JSON todavía.</p></div>`;
}

function renderAplicativos(state){
  const root = document.getElementById('aplicativos-root');
  if(!root) return;

  const apps = (state?.data?.aplicativos)||[];
  const sections = Array.from(new Set(apps.map(a=>a.seccion||'Otros'))).sort((a,b)=>a.localeCompare(b,'es'));
  let activeSection = 'Todos';

  const iconFor = (a)=>{
    const blob = norm([a.seccion,a.tipo,a.nombre].join(' '));
    if(blob.includes('asistencia')) return '✅';
    if(blob.includes('novedad') || blob.includes('incidente')) return '⚠️';
    if(blob.includes('calendario')) return '🗓️';
    if(blob.includes('informe') || blob.includes('reporte')) return '📝';
    if(blob.includes('finanza') || blob.includes('pago') || blob.includes('nomina')) return '💰';
    if(blob.includes('drive') || blob.includes('carpeta') || blob.includes('evidencia')) return '📎';
    if(blob.includes('whatsapp') || blob.includes('chat')) return '💬';
    if(blob.includes('docente') || blob.includes('prof')) return '👩‍🏫';
    if(blob.includes('estudiante') || blob.includes('nna')) return '🧒';
    if(blob.includes('dashboard')) return '📊';
    return '🧩';
  };

  root.innerHTML = `
    <div class="toolbar">
      <div class="search">
        <input id="apps-q" type="search" placeholder="Buscar (no sensible a tildes)…" autocomplete="off" />
      </div>
      <div class="chips" id="apps-filter"></div>
    </div>
    <div id="apps-wrap"></div>
  `;

  const qEl = document.getElementById('apps-q');
  const filterEl = document.getElementById('apps-filter');
  const wrap = document.getElementById('apps-wrap');

  const renderChips = ()=>{
    const chips = ['Todos', ...sections];
    filterEl.innerHTML = chips.map(s=>`<button class="chip ${s===activeSection?'on':''}" data-sec="${esc(s)}">${esc(s)}</button>`).join('');
    filterEl.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        activeSection = btn.getAttribute('data-sec') || 'Todos';
        renderList();
        renderChips();
      });
    });
  };

  const renderList = ()=>{
    const q = norm(qEl.value||'');
    const filtered = apps.filter(a=>{
      const sec = a.seccion || 'Otros';
      const secOk = (activeSection==='Todos') || (sec===activeSection);
      if(!secOk) return false;
      if(!q) return true;
      const blob = norm([a.nombre,a.link,a.tipo,a.seccion].join(' '));
      return blob.includes(q);
    });

    // agrupar por sección
    const by = {};
    for(const a of filtered){
      const k = a.seccion || 'Otros';
      (by[k] ||= []).push(a);
    }
    const keys = Object.keys(by).sort((a,b)=>a.localeCompare(b,'es'));

    wrap.innerHTML = keys.map(k=>{
      const list = by[k];
      return `
        <div class="appSectionTitle">${esc(k)} <span class="muted" style="font-weight:700">· ${list.length}</span></div>
        <div class="launchpad">
          ${list.map(a=>{
            const link = esc(a.link||'#');
            const name = esc(a.nombre||'');
            const tipo = esc(a.tipo||'');
            const sec = esc(a.seccion||'');
            return `
              <a class="appTile" href="${link}" target="_blank" rel="noopener">
                <button class="copyMini" type="button" data-copy="${link}" title="Copiar link">⧉</button>
                <div class="appIcon" aria-hidden="true">${iconFor(a)}</div>
                <div class="appName">${name}</div>
                <div class="appDesc">${esc(a.descripcion||'Acceso rápido al aplicativo.')}</div>
                <div class="appBadges">
                  <span class="badge tiny soft">${tipo || 'Link'}</span>
                  <span class="badge tiny info">${sec || 'Otros'}</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `;
    }).join('') || `<p class="muted">No hay resultados con ese filtro.</p>`;

    // Copy mini buttons (evitar que abra el link al copiar)
    wrap.querySelectorAll('button[data-copy]').forEach(btn=>{
      btn.addEventListener('click', async (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        const val = btn.getAttribute('data-copy')||'';
        try{
          await navigator.clipboard.writeText(val);
          toast('Link copiado ✅', val);
        }catch(e){
          const ta = document.createElement('textarea');
          ta.value = val; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          ta.remove();
          toast('Link copiado ✅', val);
        }
      });
    });
  };

  qEl.addEventListener('input', renderList);
  renderChips();
  renderList();
}