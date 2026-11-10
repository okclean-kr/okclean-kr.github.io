// admin.js 필터 유지 패치
const FILTER_KEY='okclean_admin_filters_v1';

function saveFilters(){
  try{
    localStorage.setItem(FILTER_KEY,JSON.stringify({
      search:$('search').value,
      status:$('statusFilter').value
    }));
  }catch(_){}
}

function restoreFilters(){
  try{
    const saved=JSON.parse(localStorage.getItem(FILTER_KEY)||'{}');
    if(typeof saved.search==='string') $('search').value=saved.search;
    if(typeof saved.status==='string') $('statusFilter').value=saved.status;
  }catch(_){}
}

restoreFilters();

$('search').oninput=()=>{
  saveFilters();
  render();
};

$('statusFilter').onchange=()=>{
  saveFilters();
  render();
};
