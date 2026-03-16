document.addEventListener('DOMContentLoaded', function(){
	const selectAll = document.getElementById('selectAll');
	if(selectAll){
		selectAll.addEventListener('change', function(){
			const rows = document.querySelectorAll('.items-table tbody input[type="checkbox"]');
			rows.forEach(cb => cb.checked = this.checked);
		});
	}

	const lowBtn = document.querySelector('.show-low');
	if(lowBtn){
		lowBtn.addEventListener('click', function(){ this.classList.toggle('active'); });
	}

	// pending actions badge demo (no backend)
	const pendingBtn = document.querySelector('.pending-actions .dot');
	if(pendingBtn){
		// keep as-is or update dynamically
	}
});
