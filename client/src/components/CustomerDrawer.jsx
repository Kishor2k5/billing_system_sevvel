import React, { useEffect, useState } from 'react';
import './CustomerDrawer.css';

const PHONE_RE = /^\d{10}$/;
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

export default function CustomerDrawer({ isOpen, mode = 'add', customerData, onClose, onSave }){
  const [form, setForm] = useState({ name: '', mobile: '', address:'', gstin:'', notes:''});
  const [errors, setErrors] = useState({});

  useEffect(()=>{
    if (customerData) setForm({
      name: customerData.name || '',
      mobile: customerData.mobile || '',
      address: customerData.address || '',
      gstin: customerData.gstin || '',
      notes: customerData.notes || '',
    });
    else setForm({ name:'', mobile:'', address:'', gstin:'', notes:''});
    setErrors({});
  },[customerData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (k,v)=>{ setForm(s=>({...s,[k]:v})); setErrors(e=>({...e,[k]:undefined})); };

  const validate = ()=>{
    const e = {};
    if (!form.name || !form.name.trim()) e.name = 'Customer name is required';
    if (!form.mobile || !PHONE_RE.test(String(form.mobile))) e.mobile = 'Enter valid 10-digit mobile number';
    if (form.gstin && !GST_RE.test(String(form.gstin).toUpperCase())) e.gstin = 'Invalid GSTIN format';
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleSubmit = async (ev)=>{
    ev.preventDefault();
    if (!validate()) return;
    try{
      await onSave(form, mode==='add');
    }catch(err){
      // bubble up; parent may show toast
    }
  };

  const close = ()=>{ onClose && onClose(); };

  return (
    <div className="drawer-overlay" onMouseDown={close}>
      <aside className="drawer" onMouseDown={(e)=>e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <h3>{mode==='add' ? 'Add Customer' : 'Edit Customer'}</h3>
          <button className="close" onClick={close}>✕</button>
        </div>
        <form className="drawer-form" onSubmit={handleSubmit}>
          <label>Customer Name *</label>
          <input value={form.name} onChange={(e)=>handleChange('name', e.target.value)} />
          {errors.name && <div className="error">{errors.name}</div>}

          <label>Mobile Number *</label>
          <input value={form.mobile} onChange={(e)=>handleChange('mobile', e.target.value)} />
          {errors.mobile && <div className="error">{errors.mobile}</div>}

          <label>Address</label>
          <textarea value={form.address} onChange={(e)=>handleChange('address', e.target.value)} />

          <label>GSTIN</label>
          <input value={form.gstin} onChange={(e)=>handleChange('gstin', e.target.value)} />
          {errors.gstin && <div className="error">{errors.gstin}</div>}

          <label>Notes</label>
          <textarea value={form.notes} onChange={(e)=>handleChange('notes', e.target.value)} />

          <div className="drawer-actions">
            <button type="button" className="ghost" onClick={close}>Cancel</button>
            <button type="submit" className="primary">{mode==='add' ? 'Save Customer' : 'Update Customer'}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}
