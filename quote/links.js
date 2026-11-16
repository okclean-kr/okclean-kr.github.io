/* Enhances existing public records; never invents reviews or before/after pairs. */
(function(){
 const featured=document.querySelector('#featured-work .featured-grid');
 if(featured){
  const data=[{service:'regular',region:'화천'},{service:'carpet',region:'춘천'},{service:'aircon',region:'화천'}];
  const filters=document.createElement('div');filters.className='service-shortcuts';filters.setAttribute('aria-label','대표 작업 지역 선택');
  for(const region of['전체','춘천','화천']){const button=document.createElement('button');button.type='button';button.className='chip';button.textContent=region;button.setAttribute('aria-pressed',String(region==='전체'));button.onclick=()=>{filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));featured.querySelectorAll('[data-work-region]').forEach(el=>el.hidden=region!=='전체'&&el.dataset.workRegion!==region);};filters.append(button);}
  featured.before(filters);
  [...featured.children].forEach((card,i)=>{if(!data[i])return;const wrapper=document.createElement('article');wrapper.dataset.workRegion=data[i].region;wrapper.style.minWidth='0';card.replaceWith(wrapper);wrapper.append(card);card.style.display='block';const link=document.createElement('a');link.className='btn line small';link.style.marginTop='10px';link.href='quote/?svc='+data[i].service+'&region='+encodeURIComponent(data[i].region);link.textContent='이 서비스 견적 문의';wrapper.append(link);});
  const note=document.createElement('p');note.className='note';note.textContent='공개된 실제 작업 기록입니다. 고객 후기·별점이나 전후 비교로 표시하지 않습니다. 확인된 후기와 동일 현장의 전후 사진이 확보되면 동의 범위에서 추가합니다.';featured.after(note);
 }
})();
