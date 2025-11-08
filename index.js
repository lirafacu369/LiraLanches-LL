// ===== Utilidades
const fmtBRL = v => (new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})).format(v||0);
const today0 = () => { const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); };
const byId = id => document.getElementById(id);

// ===== Persistência (LocalStorage)
const LS = {
  load(){
    const state = JSON.parse(localStorage.getItem('ll-state')||'{}');
    return {
      seqP: state.seqP||3,
      seqV: state.seqV||0,
      produtos: state.produtos||[
        {id:1,nome:'X-Salada',preco:12,estoque:20},
        {id:2,nome:'Suco de Laranja',preco:7.5,estoque:30},
        {id:3,nome:'Coxinha',preco:6,estoque:40},
      ],
      vendas: state.vendas||[]
    }
  },
  save(s){ localStorage.setItem('ll-state', JSON.stringify(s)); }
};
let S = LS.load();

// ===== Tabs
const tabs = document.querySelectorAll('.tab');
const sections = {
  produtos: byId('tab-produtos'), vendas: byId('tab-vendas'), relatorios: byId('tab-relatorios')
};
tabs.forEach(t=>t.onclick=()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  Object.values(sections).forEach(sec=>sec.classList.add('hidden'));
  sections[t.dataset.tab].classList.remove('hidden');
  renderAll();
});

// ===== Produtos
function addProduto(nome,preco,estoque){
  if(!nome) return alert('Informe o nome');
  const n = Number(preco); const e = parseInt(estoque||0,10);
  if(isNaN(n)||n<=0) return alert('Preço inválido');
  if(isNaN(e)||e<0) return alert('Estoque inválido');
  const p={id:++S.seqP,nome,preco:n,estoque:e};
  S.produtos.push(p); LS.save(S); renderProdutos(); renderResumo(); fillVendasSelect();
}
function removerProduto(id){
  if(!confirm('Remover produto?')) return;
  S.produtos = S.produtos.filter(p=>p.id!==id);
  LS.save(S); renderAll();
}
function alterarEstoque(id,delta){
  const p=S.produtos.find(x=>x.id===id); if(!p) return;
  const novo=parseInt(prompt('Novo estoque para '+p.nome+':', p.estoque),10);
  if(isNaN(novo)||novo<0) return;
  p.estoque=novo; LS.save(S); renderProdutos(); renderResumo();
}

// ===== Vendas
function registrarVenda(prodId, qtd){
  const p=S.produtos.find(x=>x.id==prodId); if(!p) return alert('Produto não encontrado');
  const q=parseInt(qtd,10); if(isNaN(q)||q<=0) return alert('Quantidade inválida');
  if(p.estoque<q) return alert('Estoque insuficiente');
  const total = +(p.preco*q).toFixed(2);
  const venda={ id: ++S.seqV, prodId:p.id, qtd:q, total, ts: Date.now() };
  p.estoque -= q; S.vendas.push(venda); LS.save(S);
  renderAll();
}

// ===== Relatórios helpers
const vendasDeHoje = () => S.vendas.filter(v=>v.ts>=today0());
const totalVendido = (vs) => vs.reduce((a,v)=>a+v.total,0);

// ===== Renderizações
function renderResumo(){
  const estoqueTotal = S.produtos.reduce((a,p)=>a+p.estoque,0);
  const hoje = vendasDeHoje();
  byId('kpiResumo').innerHTML = `
    <span class="pill">Estoque: <b>${estoqueTotal}</b> itens</span>
    <span class="pill">Vendido hoje: <b>${fmtBRL(totalVendido(hoje))}</b></span>
  `;
}

function renderProdutos(){
  const term = byId('busca').value.trim().toLowerCase();
  const tbody = byId('tblProdutos').querySelector('tbody');
  tbody.innerHTML='';
  S.produtos
    .filter(p=>!term || p.nome.toLowerCase().includes(term))
    .sort((a,b)=>a.nome.localeCompare(b.nome))
    .forEach(p=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.nome}</td>
        <td>${fmtBRL(p.preco)}</td>
        <td>${p.estoque}</td>
        <td>
          <button onclick="alterarEstoque(${p.id})">Estoque</button>
          <button onclick="removerProduto(${p.id})">Remover</button>
        </td>`;
      tbody.appendChild(tr);
    });
}

function fillVendasSelect(){
  const sel = byId('vProduto');
  sel.innerHTML='';
  S.produtos.sort((a,b)=>a.nome.localeCompare(b.nome)).forEach(p=>{
    const o=document.createElement('option');
    o.value=p.id; o.textContent=`#${p.id} • ${p.nome}`; sel.appendChild(o);
  });
  updateVendaCampos();
}
function updateVendaCampos(){
  const id=byId('vProduto').value; const p=S.produtos.find(x=>x.id==id); const q = parseInt(byId('vQtd').value||0,10);
  byId('vPreco').value = p? fmtBRL(p.preco):'';
  byId('vTotal').value = p&&q>0? fmtBRL(p.preco*q):'';
}

function renderVendas(){
  const tbody = byId('tblVendas').querySelector('tbody');
  tbody.innerHTML='';
  [...S.vendas].reverse().slice(0,100).forEach(v=>{
    const p=S.produtos.find(x=>x.id===v.prodId);
    const tr=document.createElement('tr');
    const dt = new Date(v.ts).toLocaleString('pt-BR');
    tr.innerHTML = `<td>${v.id}</td><td>${p?p.nome:('#'+v.prodId)}</td><td>${v.qtd}</td><td>${fmtBRL(v.total)}</td><td>${dt}</td>`;
    tbody.appendChild(tr);
  });
}

function renderRelatorios(){
  const hoje = vendasDeHoje();
  byId('kpiRelatorios').innerHTML = `
    <span class="pill">Vendas hoje: <b>${hoje.length}</b></span>
    <span class="pill">Faturamento hoje: <b>${fmtBRL(totalVendido(hoje))}</b></span>
    <span class="pill">Faturamento total: <b>${fmtBRL(totalVendido(S.vendas))}</b></span>
  `;
  // Top produtos
  const mapa = new Map();
  S.vendas.forEach(v=>{
    const p=S.produtos.find(x=>x.id===v.prodId); if(!p) return;
    const o=mapa.get(p.nome)||{nome:p.nome,qt:0,val:0}; o.qt+=v.qtd; o.val+=v.total; mapa.set(p.nome,o);
  });
  const tbody=byId('tblTop').querySelector('tbody');
  tbody.innerHTML='';
  [...mapa.values()].sort((a,b)=>b.qt-a.qt).forEach(o=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${o.nome}</td><td>${o.qt}</td><td>${fmtBRL(o.val)}</td>`; tbody.appendChild(tr);
  });
}

function renderAll(){ renderResumo(); renderProdutos(); fillVendasSelect(); renderVendas(); renderRelatorios(); }

// ===== Export/Import
function exportCSV(){
  const head='id,produto,quantidade,total,data\n';
  const rows = S.vendas.map(v=>{
    const p=S.produtos.find(x=>x.id===v.prodId); const nome=p?p.nome:("#"+v.prodId);
    const dt=new Date(v.ts).toLocaleString('pt-BR');
    return `${v.id},"${nome}",${v.qtd},${v.total},"${dt}"`;
  }).join('\n');
  const blob = new Blob([head+rows],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vendas_LiraLanches-LL.csv'; a.click();
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_LiraLanches-LL.json'; a.click();
}
byId('importJSON').addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ const obj=JSON.parse(r.result); S=obj; LS.save(S); renderAll(); alert('Backup importado.'); }catch(err){ alert('Arquivo inválido.'); } };
  r.readAsText(f);
});

// ===== Eventos UI
byId('btnAddProduto').onclick=()=> addProduto(byId('pNome').value, byId('pPreco').value, byId('pEstoque').value);
byId('btnDemo').onclick=()=>{ alert('Exemplos adicionados na primeira execução. Você pode cadastrar novos produtos.'); };
byId('busca').oninput=renderProdutos; byId('btnLimparBusca').onclick=()=>{ byId('busca').value=''; renderProdutos(); };
byId('vProduto').onchange=updateVendaCampos; byId('vQtd').oninput=updateVendaCampos;
byId('btnVender').onclick=()=> registrarVenda(byId('vProduto').value, byId('vQtd').value);
byId('btnCancelarCampos').onclick=()=>{ byId('vQtd').value=''; updateVendaCampos(); };
byId('btnExportCSV').onclick=exportCSV; byId('btnExportJSON').onclick=exportJSON;
byId('btnApagar').onclick=()=>{ if(confirm('Apagar todos os dados?')){ localStorage.removeItem('ll-state'); S=LS.load(); renderAll(); } };

// Inicializa
renderAll();