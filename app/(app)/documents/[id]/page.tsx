<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Backread Editor</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f0f1f5;
  --surface:#ffffff;
  --surface2:#f8f9fb;
  --border:#e2e4ea;
  --border2:#d0d3dc;
  --text:#0d0f1a;
  --text2:#4b5068;
  --text3:#8b91a8;
  --accent:#7c3aed;
  --accent-light:#ede9fe;
  --accent2:#06b6d4;
  --danger:#ef4444;
  --success:#22c55e;
  --radius:8px;
  --radius-lg:12px;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06);
  --shadow-lg:0 8px 32px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
}
html,body{height:100%;overflow:hidden;font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}

/* ========== APP SHELL ========== */
#app{display:flex;flex-direction:column;height:100vh}

/* ========== TOP BAR ========== */
#topbar{
  height:52px;display:flex;align-items:center;gap:0;
  background:var(--surface);border-bottom:1px solid var(--border);
  padding:0 12px;flex-shrink:0;position:relative;z-index:100;
  box-shadow:0 1px 0 var(--border);
}
.tb-logo{display:flex;align-items:center;gap:8px;padding:0 8px;text-decoration:none}
.tb-logo-mark{width:28px;height:28px;background:var(--accent);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tb-logo-mark svg{width:16px;height:16px}
.tb-logo-name{font-size:13.5px;font-weight:700;color:var(--text);letter-spacing:-.01em}
.tb-sep{width:1px;height:28px;background:var(--border);margin:0 6px;flex-shrink:0}
.tb-doc-area{display:flex;align-items:center;gap:6px;flex:1;min-width:0;max-width:320px}
.tb-emoji-btn{font-size:18px;background:none;border:none;cursor:pointer;padding:3px 4px;border-radius:6px;line-height:1;transition:background .12s}
.tb-emoji-btn:hover{background:var(--surface2)}
.tb-doc-title{border:none;outline:none;font:600 14px/1 'DM Sans',sans-serif;color:var(--text);background:transparent;flex:1;min-width:0;padding:4px 6px;border-radius:6px;transition:background .12s}
.tb-doc-title:hover{background:var(--surface2)}
.tb-doc-title:focus{background:var(--surface2);box-shadow:0 0 0 2px var(--accent-light)}
.tb-status{font-size:10.5px;font-weight:600;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:99px;flex-shrink:0}
.tb-status.live{background:#dcfce7;color:#15803d}
.tb-status.draft{background:var(--surface2);color:var(--text3)}
.tb-actions{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0}
.tb-save{font-size:10.5px;color:var(--text3);font-family:'DM Mono',monospace;min-width:90px;text-align:right}
.tb-save.saving{color:var(--accent)}
.tb-btn{height:32px;padding:0 12px;border-radius:var(--radius);font:500 13px 'DM Sans',sans-serif;border:1px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .12s;white-space:nowrap}
.tb-btn:hover{background:var(--surface2);border-color:var(--border2);color:var(--text)}
.tb-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;box-shadow:0 2px 8px rgba(124,58,237,.25)}
.tb-btn.primary:hover{background:#6d28d9;box-shadow:0 2px 12px rgba(124,58,237,.35)}
.tb-btn svg{width:14px;height:14px;flex-shrink:0}
.tb-avatar{width:30px;height:30px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;cursor:pointer;flex-shrink:0}

/* ========== TOOLBAR ========== */
#toolbar{
  height:46px;background:var(--surface);border-bottom:1px solid var(--border);
  display:flex;align-items:center;padding:0 10px;gap:2px;flex-shrink:0;
  overflow-x:auto;
}
.tool-group{display:flex;align-items:center;gap:1px}
.tool-div{width:1px;height:22px;background:var(--border);margin:0 6px;flex-shrink:0}
.tbtn{width:32px;height:32px;border:none;background:transparent;color:var(--text2);border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;flex-shrink:0;position:relative}
.tbtn:hover{background:var(--surface2);color:var(--text)}
.tbtn.active{background:var(--accent-light);color:var(--accent)}
.tbtn svg{width:15px;height:15px;pointer-events:none}
.tbtn[title]:hover::after{content:attr(title);position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);background:var(--text);color:#fff;font-size:11px;padding:2px 7px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:999;font-family:'DM Sans',sans-serif}
.font-select{height:30px;border:1px solid var(--border);border-radius:6px;padding:0 24px 0 8px;font:400 12px 'DM Sans',sans-serif;color:var(--text);background:var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238b91a8'/%3E%3C/svg%3E") no-repeat right 7px center;-webkit-appearance:none;cursor:pointer;outline:none;min-width:130px}
.font-select:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-light)}
.font-size-input{width:48px;height:30px;border:1px solid var(--border);border-radius:6px;padding:0 6px;font:400 12px 'DM Mono',monospace;color:var(--text);text-align:center;outline:none;background:var(--surface)}
.font-size-input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-light)}
.fmt-btn{width:28px;height:28px;border:none;background:transparent;color:var(--text2);border-radius:5px;cursor:pointer;font:600 14px 'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;transition:all .12s}
.fmt-btn:hover{background:var(--surface2);color:var(--text)}
.fmt-btn.on{background:var(--accent-light);color:var(--accent)}
.color-swatch-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}
.color-swatch-wrap label{font-size:8.5px;color:var(--text3);font-family:'DM Mono',monospace;letter-spacing:.04em;text-transform:uppercase}
input[type=color]{width:26px;height:26px;border:1.5px solid var(--border);border-radius:6px;cursor:pointer;padding:0;-webkit-appearance:none}
input[type=color]::-webkit-color-swatch-wrapper{padding:2px}
input[type=color]::-webkit-color-swatch{border:none;border-radius:3px}
.zoom-control{display:flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:2px 8px;height:30px;margin-left:auto}
.zoom-btn{background:none;border:none;cursor:pointer;color:var(--text2);font-size:18px;line-height:1;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:all .12s}
.zoom-btn:hover{background:var(--border);color:var(--text)}
.zoom-val{font:500 11px 'DM Mono',monospace;color:var(--text2);min-width:36px;text-align:center}

/* ========== BODY ========== */
#body{display:flex;flex:1;overflow:hidden}

/* ========== LEFT PANEL ========== */
#left-panel{
  width:64px;flex-shrink:0;background:var(--surface);
  border-right:1px solid var(--border);
  display:flex;flex-direction:column;align-items:center;
  padding:8px 0;gap:2px;overflow-y:auto;
}
.side-btn{
  width:48px;height:52px;border:none;background:transparent;
  border-radius:var(--radius);cursor:pointer;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;transition:all .15s;
  color:var(--text2);position:relative;
}
.side-btn:hover{background:var(--surface2);color:var(--text)}
.side-btn.active{background:var(--accent-light);color:var(--accent)}
.side-btn svg{width:20px;height:20px}
.side-btn span{font-size:9.5px;font-weight:500;line-height:1;letter-spacing:.01em}
.side-div{width:32px;height:1px;background:var(--border);margin:4px 0}
.side-badge{position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--accent)}

/* ========== PAGE STRIP ========== */
#page-strip{
  width:148px;flex-shrink:0;background:var(--surface);
  border-right:1px solid var(--border);display:flex;flex-direction:column;
}
.ps-header{
  height:44px;display:flex;align-items:center;justify-content:space-between;
  padding:0 12px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.ps-label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em}
.ps-add{width:22px;height:22px;background:var(--accent);border:none;border-radius:5px;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;line-height:1;box-shadow:0 2px 6px rgba(124,58,237,.3)}
.ps-add:hover{background:#6d28d9;transform:scale(1.05)}
.ps-list{flex:1;overflow-y:auto;padding:10px 8px;display:flex;flex-direction:column;gap:8px}
.ps-page{
  cursor:pointer;border-radius:var(--radius);border:2px solid var(--border);
  overflow:hidden;transition:all .15s;background:#fff;position:relative;
}
.ps-page:hover{border-color:var(--border2);box-shadow:0 2px 8px rgba(0,0,0,.08)}
.ps-page.active{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,58,237,.12)}
.ps-page-thumb{width:100%;aspect-ratio:16/9;background:#fff;min-height:72px}
.ps-page-footer{
  position:absolute;bottom:0;left:0;right:0;padding:2px 6px;
  background:rgba(255,255,255,.92);display:flex;justify-content:space-between;align-items:center;
  backdrop-filter:blur(4px);
}
.ps-page-num{font:600 9px 'DM Mono',monospace;color:var(--text3)}
.ps-page-del{
  width:14px;height:14px;border-radius:3px;background:var(--danger);border:none;
  color:#fff;font-size:9px;cursor:pointer;display:none;align-items:center;justify-content:center;
}
.ps-page:hover .ps-page-del{display:flex}
.ps-footer{height:36px;border-top:1px solid var(--border);display:flex;align-items:center;padding:0 12px;flex-shrink:0}
.ps-count{font-size:10px;color:var(--text3);font-family:'DM Mono',monospace}

/* ========== CANVAS AREA ========== */
#canvas-area{
  flex:1;display:flex;align-items:center;justify-content:center;
  background:var(--bg);overflow:auto;position:relative;
}
#canvas-area::before{
  content:'';position:absolute;inset:0;
  background-image:radial-gradient(circle,var(--border2) 1px,transparent 1px);
  background-size:24px 24px;opacity:.5;pointer-events:none;
}
#canvas-wrap{
  position:relative;z-index:1;
  box-shadow:var(--shadow-lg),0 0 0 1px var(--border);
  border-radius:2px;
  transition:transform .1s;
}
#canvas-wrap canvas{display:block}
#drop-overlay{
  position:absolute;inset:0;background:rgba(124,58,237,.05);
  border:2px dashed var(--accent);border-radius:var(--radius-lg);
  display:none;align-items:center;justify-content:center;z-index:200;pointer-events:none;
}
#drop-overlay span{
  background:var(--surface);color:var(--accent);font-weight:600;font-size:15px;
  padding:10px 22px;border-radius:var(--radius-lg);box-shadow:var(--shadow);
}
#page-nav{
  position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
  background:var(--surface);border:1px solid var(--border);border-radius:22px;
  padding:5px 14px;display:flex;align-items:center;gap:8px;z-index:10;
  box-shadow:var(--shadow);
}
.pnav-btn{background:none;border:none;cursor:pointer;color:var(--text2);font-size:20px;line-height:1;padding:0 2px;border-radius:4px;transition:all .12s}
.pnav-btn:hover{background:var(--surface2);color:var(--text)}
.pnav-btn:disabled{opacity:.3;cursor:default}
.pnav-text{font:500 12px 'DM Mono',monospace;color:var(--text2);min-width:48px;text-align:center}

/* ========== RIGHT PANEL (Properties) ========== */
#right-panel{
  width:0;flex-shrink:0;background:var(--surface);
  border-left:1px solid var(--border);display:flex;flex-direction:column;
  overflow:hidden;transition:width .2s ease;
}
#right-panel.open{width:200px}
.rp-header{padding:10px 14px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;flex-shrink:0}
.rp-body{padding:14px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1}
.rp-prop label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:5px}
.rp-num{width:100%;height:30px;background:var(--surface2);border:1.5px solid var(--border);color:var(--text);border-radius:7px;padding:0 10px;font:400 12px 'DM Mono',monospace;outline:none}
.rp-num:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-light)}
.rp-range{width:100%;accent-color:var(--accent)}

/* ========== MODALS ========== */
.modal-bg{
  position:fixed;inset:0;background:rgba(13,15,26,.5);z-index:1000;
  display:flex;align-items:center;justify-content:center;
  backdrop-filter:blur(8px);animation:fadein .15s ease;
}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.modal{
  background:var(--surface);border-radius:20px;padding:40px 44px;
  width:min(900px,95vw);max-height:90vh;overflow-y:auto;
  box-shadow:0 32px 80px rgba(0,0,0,.2),0 0 0 1px var(--border);
  animation:slideup .2s ease;
}
@keyframes slideup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.modal-icon{width:36px;height:36px;background:var(--accent-light);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:10px}
.modal-badge{font-size:10px;font-weight:700;color:var(--accent);letter-spacing:.1em;font-family:'DM Mono',monospace;margin-bottom:8px;text-transform:uppercase}
.modal-title{font-size:28px;font-weight:700;letter-spacing:-.03em;margin-bottom:6px;color:var(--text)}
.modal-sub{font-size:14px;color:var(--text2);margin-bottom:32px;line-height:1.5}
.tpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
.tpl-card{
  border:2px solid var(--border);border-radius:14px;padding:22px 20px;
  cursor:pointer;text-align:left;font-family:inherit;transition:all .18s;
  background:var(--surface);position:relative;overflow:hidden;
}
.tpl-card::before{content:'';position:absolute;inset:0;background:var(--tpl-bg,transparent);opacity:.6}
.tpl-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.1);border-color:var(--border2)}
.tpl-card-inner{position:relative;z-index:1}
.tpl-emoji{font-size:30px;margin-bottom:12px;display:block}
.tpl-name{font-size:16px;font-weight:700;margin-bottom:4px;color:var(--text)}
.tpl-desc{font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.4}
.tpl-pages{
  font-size:10px;font-weight:700;font-family:'DM Mono',monospace;
  padding:2px 9px;border-radius:5px;background:rgba(255,255,255,.85);
  display:inline-block;
}
.modal-footer{display:flex;justify-content:center;gap:10px}
.modal-btn{
  height:40px;padding:0 28px;border-radius:10px;font:600 13px 'DM Sans',sans-serif;
  border:2px solid var(--border);background:var(--surface);color:var(--text2);cursor:pointer;transition:all .14s;
}
.modal-btn:hover{background:var(--surface2);border-color:var(--border2);color:var(--text)}

/* ========== SHARE DRAWER ========== */
#share-drawer{
  position:fixed;top:0;right:-420px;width:420px;height:100vh;
  background:var(--surface);border-left:1px solid var(--border);
  box-shadow:-8px 0 48px rgba(0,0,0,.12);z-index:200;
  display:flex;flex-direction:column;transition:right .25s ease;
}
#share-drawer.open{right:0}
.sd-header{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0}
.sd-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:3px}
.sd-sub{font-size:12px;color:var(--text3)}
.sd-close{width:30px;height:30px;background:var(--surface2);border:none;cursor:pointer;border-radius:7px;color:var(--text2);display:flex;align-items:center;justify-content:center;transition:all .12s}
.sd-close:hover{background:var(--border);color:var(--text)}
.sd-body{flex:1;overflow-y:auto;padding:20px 24px}
.sd-section-label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px}
.share-link-card{border:1.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;transition:border-color .12s}
.share-link-card:hover{border-color:var(--border2)}
.slc-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.slc-name{flex:1;font-size:13px;font-weight:600;color:var(--text)}
.slc-status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px}
.slc-status.on{background:#dcfce7;color:#15803d}
.slc-status.off{background:var(--surface2);color:var(--text3)}
.slc-url-row{display:flex;gap:6px;margin-bottom:10px}
.slc-url{flex:1;font:400 11px 'DM Mono',monospace;color:var(--text2);background:var(--surface2);padding:5px 9px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--border)}
.slc-copy{height:28px;padding:0 11px;background:var(--surface2);border:1.5px solid var(--border);border-radius:7px;font:600 11px 'DM Sans',sans-serif;color:var(--text2);cursor:pointer;white-space:nowrap;transition:all .12s}
.slc-copy:hover{background:var(--surface);border-color:var(--border2)}
.slc-copy.copied{background:#f0fdf4;border-color:#86efac;color:#15803d}
.slc-meta{display:flex;gap:10px;font-size:11px;color:var(--text3);flex-wrap:wrap}
.slc-actions{margin-top:10px;display:flex;justify-content:flex-end}
.slc-toggle{font:500 12px 'DM Sans',sans-serif;background:none;border:none;cursor:pointer;transition:color .12s}
.slc-toggle.disable{color:var(--danger)}
.slc-toggle.enable{color:var(--success)}
.new-link-form{border:2px dashed var(--border);border-radius:12px;padding:16px;margin-top:6px}
.new-link-form.solid{border-style:solid;border-color:var(--border)}
.nlf-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px}
.nlf-field{margin-bottom:10px}
.nlf-field label{font-size:11px;font-weight:600;color:var(--text2);display:block;margin-bottom:4px}
.nlf-field input[type=text],.nlf-field input[type=password]{
  width:100%;height:34px;border:1.5px solid var(--border);border-radius:7px;
  padding:0 10px;font:400 13px 'DM Sans',sans-serif;color:var(--text);outline:none;
  background:var(--surface);transition:border-color .12s;
}
.nlf-field input:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-light)}
.nlf-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0}
.nlf-toggle-label{font-size:12px;color:var(--text2);font-weight:500}
.toggle-sw{position:relative;width:34px;height:19px;cursor:pointer}
.toggle-sw input{opacity:0;width:0;height:0;position:absolute}
.toggle-track{position:absolute;inset:0;background:var(--border2);border-radius:99px;transition:background .2s}
.toggle-thumb{position:absolute;width:15px;height:15px;background:#fff;border-radius:50%;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.toggle-sw input:checked ~ .toggle-track{background:var(--accent)}
.toggle-sw input:checked ~ .toggle-thumb{transform:translateX(15px)}
.nlf-actions{display:flex;gap:8px;margin-top:12px}
.nlf-btn{height:32px;padding:0 16px;border-radius:7px;font:600 12px 'DM Sans',sans-serif;cursor:pointer;transition:all .12s}
.nlf-btn.primary{background:var(--accent);border:none;color:#fff;box-shadow:0 2px 6px rgba(124,58,237,.3)}
.nlf-btn.primary:hover{background:#6d28d9}
.nlf-btn.ghost{background:none;border:1.5px solid var(--border);color:var(--text2)}
.nlf-btn.ghost:hover{background:var(--surface2);border-color:var(--border2)}
.add-link-btn{
  width:100%;height:42px;background:none;border:2px dashed var(--border);
  border-radius:12px;cursor:pointer;font:500 13px 'DM Sans',sans-serif;color:var(--text3);
  display:flex;align-items:center;justify-content:center;gap:6px;transition:all .14s;
}
.add-link-btn:hover{border-color:var(--border2);color:var(--text2);background:var(--surface2)}

/* ========== EMOJI PICKER ========== */
.emoji-picker{
  position:absolute;top:100%;left:0;z-index:500;
  background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:10px;display:flex;flex-wrap:wrap;gap:3px;width:244px;
  box-shadow:var(--shadow-lg);animation:fadeup .12s ease;
}
@keyframes fadeup{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.emoji-btn{font-size:20px;background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;line-height:1;transition:all .1s}
.emoji-btn:hover{background:var(--surface2);transform:scale(1.2)}

/* Present modal */
.present-modal{
  position:fixed;inset:0;background:#000;z-index:2000;
  display:none;flex-direction:column;align-items:center;justify-content:center;
}
.present-modal.open{display:flex}
.present-close{
  position:absolute;top:16px;right:16px;width:36px;height:36px;
  background:rgba(255,255,255,.1);border:none;color:#fff;border-radius:8px;
  cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;z-index:1;
  transition:background .12s;
}
.present-close:hover{background:rgba(255,255,255,.2)}
#present-canvas-wrap{max-width:90vw;max-height:85vh}
</style>
</head>
<body>
<div id="app">

  <!-- TOP BAR -->
  <div id="topbar">
    <a class="tb-logo" href="#">
      <div class="tb-logo-mark">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="white" stroke-width="1.3"/><path d="M5 6h6M5 9h4" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
      <span class="tb-logo-name">Backread</span>
    </a>
    <div class="tb-sep"></div>
    <div class="tb-doc-area" style="position:relative">
      <button class="tb-emoji-btn" id="emojiBtn" onclick="toggleEmoji()">📄</button>
      <div class="emoji-picker" id="emojiPicker" style="display:none">
        <button class="emoji-btn" onclick="setEmoji(this)">📄</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🚀</button>
        <button class="emoji-btn" onclick="setEmoji(this)">💼</button>
        <button class="emoji-btn" onclick="setEmoji(this)">📊</button>
        <button class="emoji-btn" onclick="setEmoji(this)">📋</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🎯</button>
        <button class="emoji-btn" onclick="setEmoji(this)">💡</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🔍</button>
        <button class="emoji-btn" onclick="setEmoji(this)">📈</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🤝</button>
        <button class="emoji-btn" onclick="setEmoji(this)">⚡</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🌟</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🔒</button>
        <button class="emoji-btn" onclick="setEmoji(this)">📝</button>
        <button class="emoji-btn" onclick="setEmoji(this)">🎨</button>
      </div>
      <input class="tb-doc-title" id="docTitle" value="Untitled document" />
      <span class="tb-status draft" id="docStatus">DRAFT</span>
    </div>
    <div class="tb-actions">
      <span class="tb-save" id="saveStatus"></span>
      <button class="tb-btn" onclick="toggleTemplates()">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 6h13M6 6v9" stroke="currentColor" stroke-width="1.3"/></svg>
        Templates
      </button>
      <button class="tb-btn" onclick="presentMode()">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 13h6M8 10.5V13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Present
      </button>
      <button class="tb-btn" id="shareBtn" onclick="toggleShare()">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="13" cy="3" r="1.5" stroke="currentColor" stroke-width="1.2"/><circle cx="13" cy="13" r="1.5" stroke="currentColor" stroke-width="1.2"/><circle cx="3" cy="8" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.4 7.3L11.6 4M4.4 8.7l7.2 3.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Share
      </button>
      <button class="tb-btn primary" onclick="publishDoc()">Publish</button>
      <div class="tb-avatar">M</div>
    </div>
  </div>

  <!-- TOOLBAR -->
  <div id="toolbar">
    <div class="tool-group">
      <button class="tbtn active" id="tool-select" title="Select (V)" onclick="setTool('select')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 2.5l9 5-5 1.5-2.5 5-1.5-11.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </button>
      <button class="tbtn" id="tool-text" title="Text (T)" onclick="addText()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M8 4.5v8M5 12.5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
      <button class="tbtn" id="tool-rect" title="Rectangle" onclick="addShape('rect')">
        <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <button class="tbtn" id="tool-circle" title="Ellipse" onclick="addShape('circle')">
        <svg viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="5.5" ry="5.5" stroke="currentColor" stroke-width="1.3"/></svg>
      </button>
      <button class="tbtn" id="tool-triangle" title="Triangle" onclick="addShape('triangle')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2.5L14.5 13.5H1.5L8 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </button>
      <button class="tbtn" id="tool-draw" title="Draw (D)" onclick="setTool('draw')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 13l2-1.5L13 4l-2-2-8 8.5-1.5 2 1.5.5zM11 4l1 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="tool-div"></div>
    <div class="tool-group">
      <label class="tbtn" title="Upload image" style="cursor:pointer">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="5.5" cy="7" r="1.2" fill="currentColor"/><path d="M1 11.5l4-4 3.5 3.5 2.5-3 3 4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        <input type="file" accept="image/*" style="display:none" onchange="uploadImage(event)">
      </label>
    </div>
    <div class="tool-div"></div>
    <div class="tool-group">
      <select class="font-select" id="fontFamily" onchange="updateFont()">
        <option value="DM Sans">DM Sans</option>
        <option value="Georgia">Georgia</option>
        <option value="Playfair Display">Playfair Display</option>
        <option value="Montserrat">Montserrat</option>
        <option value="Courier New">Courier New</option>
        <option value="Impact">Impact</option>
        <option value="Trebuchet MS">Trebuchet MS</option>
        <option value="Arial">Arial</option>
      </select>
      <input class="font-size-input" id="fontSize" type="number" value="18" min="6" max="200" onchange="updateFontSize()" />
      <button class="fmt-btn" id="fmt-bold" title="Bold" onclick="toggleFormat('fontWeight','bold','normal')"><b>B</b></button>
      <button class="fmt-btn" id="fmt-italic" title="Italic" onclick="toggleFormat('fontStyle','italic','normal')"><i>I</i></button>
      <button class="fmt-btn" id="fmt-under" title="Underline" onclick="toggleUnderline()"><u>U</u></button>
    </div>
    <div class="tool-div"></div>
    <div class="tool-group" style="gap:10px">
      <div class="color-swatch-wrap">
        <input type="color" id="textColor" value="#0d0f1a" title="Text color" onchange="applyColor('text')">
        <label>TEXT</label>
      </div>
      <div class="color-swatch-wrap">
        <input type="color" id="fillColor" value="#7c3aed" title="Fill color" onchange="applyColor('fill')">
        <label>FILL</label>
      </div>
      <div class="color-swatch-wrap">
        <input type="color" id="bgColor" value="#f0f1f5" title="Page background" onchange="applyBg()">
        <label>PAGE</label>
      </div>
    </div>
    <div class="tool-div"></div>
    <div class="tool-group">
      <button class="tbtn" title="Duplicate" onclick="duplicate()">
        <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="4.5" width="9" height="9.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 4.5V3a1.5 1.5 0 0 1 1.5-1.5H13A1.5 1.5 0 0 1 14.5 3v7a1.5 1.5 0 0 1-1.5 1.5H11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
      <button class="tbtn" title="Delete (Del)" onclick="deleteSelected()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M6.5 12V7M9.5 12V7M3.5 4.5l1 8.5h7l1-8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tbtn" title="Bring to front" onclick="layerUp()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 5l4-4 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tbtn" title="Send to back" onclick="layerDown()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 11l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="tbtn" title="Align left" onclick="alignObj('left')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6.5h7M2 10h10M2 13.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
      <button class="tbtn" title="Align center" onclick="alignObj('center')">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4.5 6.5h7M3 10h10M5.5 13.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="zoom-control">
      <button class="zoom-btn" onclick="changeZoom(-0.1)">−</button>
      <span class="zoom-val" id="zoomVal">75%</span>
      <button class="zoom-btn" onclick="changeZoom(0.1)">+</button>
    </div>
  </div>

  <!-- BODY -->
  <div id="body">

    <!-- LEFT PANEL -->
    <div id="left-panel">
      <button class="side-btn active" onclick="setSidePanel('templates')" title="Templates">
        <svg viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 11.3c0-3.6 0-5.4 1-6.6a4.5 4.5 0 0 1 .75-.75C5.9 3 7.7 3 11.3 3h1.4c3.6 0 5.4 0 6.6 1a4.5 4.5 0 0 1 .75.75C21 5.9 21 7.7 21 11.3v1.4c0 3.6 0 5.4-1 6.6a4.5 4.5 0 0 1-.75.75C18.1 21 16.3 21 12.7 21h-1.4c-3.6 0-5.4 0-6.6-1a4.5 4.5 0 0 1-.75-.75C3 18.1 3 16.3 3 12.7v-1.4ZM11.3 4.5H13.5v15h-2.2c-1.8 0-3.1 0-4-.1-.9-.1-1.4-.3-1.7-.5a3 3 0 0 1-.5-.5c-.2-.3-.4-.75-.5-1.66-.1-.95-.1-2.2-.1-4v-1.4c0-1.8 0-3.1.1-4 .1-.9.3-1.4.5-1.7a3 3 0 0 1 .5-.5c.3-.2.75-.4 1.66-.5.95-.1 2.2-.1 4-.1ZM15 19.5c.67-.01 1.22-.04 1.7-.1.9-.1 1.4-.3 1.7-.5.19-.15.35-.31.5-.5.24-.3.43-.75.53-1.66.11-.95.11-2.2.11-4v-1.66H15v8.47Zm4.49-9.97c-.01-.9-.04-1.62-.11-2.21-.1-.9-.29-1.4-.53-1.66a3 3 0 0 0-.5-.5c-.3-.24-.75-.43-1.66-.53-.43-.05-1-.07-1.69-.07v5h4.49Z" fill="currentColor"/></svg>
        <span>Templates</span>
      </button>
      <button class="side-btn" onclick="setSidePanel('elements')" title="Elements">
        <svg viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" d="M6.55 11.24a1.5 1.5 0 0 0 1.42 0l.01-.01.03-.02.08-.05a10 10 0 0 0 1.14-.79c.64-.51 1.48-1.31 2.03-2.37a2.99 2.99 0 0 0-4-4.16A2.99 2.99 0 0 0 3.2 7.91c.54 1.1 1.4 1.93 2.05 2.45a10 10 0 0 0 1.25.85l.03.01.01.01ZM12.98 15.46a4.21 4.21 0 1 1-8.42 0 4.21 4.21 0 0 1 8.42 0Zm-1.5 0a2.71 2.71 0 1 1-5.42 0 2.71 2.71 0 0 1 5.42 0ZM17.54 4a1.03 1.03 0 0 0-1.78 0l-3.3 5.7a1.03 1.03 0 0 0 .89 1.54h6.61c.79 0 1.29-.86.89-1.54L17.54 4ZM16.65 5.47l-2.49 4.28h4.97l-2.48-4.28ZM20.86 17.17a4.21 4.21 0 1 1-8.43 0 4.21 4.21 0 0 1 8.43 0Zm-1.5 0a2.71 2.71 0 1 1-5.42 0 2.71 2.71 0 0 1 5.42 0Z" fill="currentColor"/></svg>
        <span>Elements</span>
      </button>
      <button class="side-btn" onclick="setSidePanel('text')" title="Text">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4.3 5.8a1.5 1.5 0 0 1 1.5-1.5h12.4a1.5 1.5 0 0 1 1.5 1.5V7.6a.75.75 0 0 1-1.5 0v-1.3a.5.5 0 0 0-.5-.5H12.8v12a.5.5 0 0 0 .5.5h1.9a.75.75 0 0 1 0 1.5H8.8a.75.75 0 0 1 0-1.5h1.9a.5.5 0 0 0 .5-.5v-12H6.3a.5.5 0 0 0-.5.5V7.7a.75.75 0 0 1-1.5 0V5.8Z" fill="currentColor"/></svg>
        <span>Text</span>
      </button>
      <button class="side-btn" onclick="setSidePanel('uploads')" title="Uploads">
        <svg viewBox="0 0 24 24" fill="none"><path d="M11.25 3a5.33 5.33 0 0 0-5.32 4.8.2.2 0 0 1-.12.16 5.73 5.73 0 0 0 2 11.1 5.73 5.73 0 0 0 5.73-5.73v-.49l1.78 1.78a.75.75 0 0 0 1.06-1.06l-3.06-3.06a.75.75 0 0 0-1.06 0L9.18 13.54a.75.75 0 0 0 1.06 1.06l1.78-1.78v.49a4.23 4.23 0 1 1-5.7-3.96 1.7 1.7 0 0 0 1.09-1.42c.2-1.94 1.86-3.44 3.83-3.44a3.85 3.85 0 0 1 3.78 3.17c.14.77.78 1.37 1.57 1.43 2.14.18 3.85 2.02 3.85 4.22a4.23 4.23 0 0 1-4.23 4.23h-1.9a.75.75 0 0 0 0 1.5h1.9a5.73 5.73 0 0 0 5.73-5.73c0-2.98-2.3-5.47-5.23-5.71a.25.25 0 0 1-.21-.2A5.35 5.35 0 0 0 11.25 3Z" fill="currentColor"/></svg>
        <span>Uploads</span>
      </button>
      <div class="side-div"></div>
      <button class="side-btn" onclick="setSidePanel('ai')" title="AI Tools">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l1.8 5.5H19l-4.4 3.5 1.5 5.5-4.1-3L7.9 16.5l1.5-5.5L5 7.5h5.2L12 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <span>AI</span>
        <div class="side-badge"></div>
      </button>
      <button class="side-btn" onclick="setSidePanel('charts')" title="Charts">
        <svg viewBox="0 0 24 24" fill="none"><path d="M3 20h18M7 10v10M12 6v14M17 14v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <span>Charts</span>
      </button>
    </div>

    <!-- PAGE STRIP -->
    <div id="page-strip">
      <div class="ps-header">
        <span class="ps-label">Pages</span>
        <button class="ps-add" onclick="addPage()" title="Add page">+</button>
      </div>
      <div class="ps-list" id="pageList"></div>
      <div class="ps-footer"><span class="ps-count" id="pageCount">1 page</span></div>
    </div>

    <!-- CANVAS AREA -->
    <div id="canvas-area"
      ondragover="event.preventDefault();document.getElementById('drop-overlay').style.display='flex'"
      ondragleave="document.getElementById('drop-overlay').style.display='none'"
      ondrop="handleDrop(event)">
      <div id="drop-overlay"><span>Drop image here</span></div>
      <div id="canvas-wrap">
        <canvas id="main-canvas"></canvas>
      </div>
      <div id="page-nav">
        <button class="pnav-btn" id="prevBtn" onclick="switchPage(currentPage-1)">‹</button>
        <span class="pnav-text" id="pageNavText">1 / 1</span>
        <button class="pnav-btn" id="nextBtn" onclick="switchPage(currentPage+1)">›</button>
      </div>
    </div>

    <!-- RIGHT PANEL (Properties) -->
    <div id="right-panel">
      <div class="rp-header">Properties</div>
      <div class="rp-body" id="propPanel"></div>
    </div>

  </div>
</div>

<!-- TEMPLATE MODAL -->
<div class="modal-bg" id="templateModal" style="display:none" onclick="if(event.target===this&&pages.length>0)this.style.display='none'">
  <div class="modal">
    <div class="modal-icon">✦</div>
    <div class="modal-badge">Backread Editor</div>
    <h2 class="modal-title">Start with a template</h2>
    <p class="modal-sub">Professionally designed starting points. Pick one and make it yours.</p>
    <div class="tpl-grid" id="tplGrid"></div>
    <div class="modal-footer">
      <button class="modal-btn" onclick="startBlank()">Start blank</button>
      <button class="modal-btn" id="cancelTplBtn" onclick="document.getElementById('templateModal').style.display='none'" style="display:none">Cancel</button>
    </div>
  </div>
</div>

<!-- SHARE DRAWER -->
<div id="share-drawer">
  <div class="sd-header">
    <div>
      <div class="sd-title">Share document</div>
      <div class="sd-sub" id="shareSubtitle">0 links created</div>
    </div>
    <button class="sd-close" onclick="toggleShare()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  </div>
  <div class="sd-body" id="shareBody">
    <div class="sd-section-label" id="linksLabel" style="display:none">Active links</div>
    <div id="linksList"></div>
    <div id="newLinkArea"></div>
  </div>
</div>

<!-- PRESENT MODAL -->
<div class="present-modal" id="presentModal">
  <button class="present-close" onclick="closePresentMode()">✕</button>
  <div id="present-canvas-wrap"></div>
</div>

<script>
// ============================================================
// CONSTANTS & STATE
// ============================================================
const CANVAS_W = 960, CANVAS_H = 540;
const FONTS = ['DM Sans','Georgia','Playfair Display','Montserrat','Courier New','Impact','Trebuchet MS','Arial'];
const EMOJIS = ['📄','🚀','💼','📊','📋','🎯','💡','🔍','📈','🤝','⚡','🌟','🔒','📝','🎨'];

let fc = null;
let pages = [];
let currentPage = 0;
let zoom = 0.75;
let activeTool = 'select';
let shareLinks = [];
let shareOpen = false;
let autoSaveTimer = null;
let showNewLinkForm = false;

// ============================================================
// TEMPLATE DEFINITIONS
// ============================================================
const W = CANVAS_W, H = CANVAS_H;
function t(text, o={}) {
  return {type:'textbox',left:o.left??60,top:o.top??60,width:o.width??400,text,fontSize:o.fs??18,fontFamily:o.ff??'DM Sans',fill:o.fill??'#0d0f1a',fontWeight:o.fw??'normal',opacity:1,selectable:true,editable:true};
}
function r(o={}) {
  return {type:'rect',left:o.left??0,top:o.top??0,width:o.w??200,height:o.h??60,fill:o.fill??'#7c3aed',rx:o.rx??0,ry:o.rx??0,selectable:true,opacity:o.op??1};
}
function makePage(bg='#fff',objects=[]) { return {version:'5.3.0',objects,background:bg}; }

const TEMPLATES = [
  {id:'pitch',name:'Pitch Deck',emoji:'📊',pages:6,desc:'Investor-ready slides',accent:'#7c3aed',bg:'linear-gradient(135deg,#f5f3ff,#ede9fe)'},
  {id:'proposal',name:'Proposal',emoji:'📋',pages:4,desc:'Client proposals',accent:'#2563eb',bg:'linear-gradient(135deg,#eff6ff,#dbeafe)'},
  {id:'report',name:'Report',emoji:'📈',pages:5,desc:'Data & analysis',accent:'#059669',bg:'linear-gradient(135deg,#ecfdf5,#d1fae5)'},
  {id:'mediakit',name:'Media Kit',emoji:'🎨',pages:4,desc:'Brand press kit',accent:'#db2777',bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)'},
  {id:'casestudy',name:'Case Study',emoji:'🔬',pages:5,desc:'Client success story',accent:'#dc2626',bg:'linear-gradient(135deg,#fff1f2,#fee2e2)'},
  {id:'onepager',name:'One-Pager',emoji:'⚡',pages:1,desc:'Single page overview',accent:'#d97706',bg:'linear-gradient(135deg,#fffbeb,#fef3c7)'},
];

function buildTemplate(id) {
  switch(id) {
    case 'pitch': return [
      makePage('#0d0f1a',[r({w:W,h:H,fill:'#0d0f1a'}),r({left:0,top:H-4,w:W,h:4,fill:'#7c3aed'}),r({left:60,top:160,w:3,h:80,fill:'#7c3aed'}),t('YOUR COMPANY',{left:80,top:155,fs:52,fw:'700',fill:'#fff',width:W-140,ff:'DM Sans'}),t('The one-line pitch that changes everything.',{left:80,top:225,fs:18,fill:'#8b91a8',width:W-140}),t('Series A · 2025',{left:80,top:H-60,fs:12,fill:'#7c3aed',ff:'DM Mono'})]),
      makePage('#fff',[r({left:0,top:0,w:W,h:4,fill:'#7c3aed'}),t('The Problem',{left:60,top:48,fs:36,fw:'700',width:500}),r({left:60,top:118,w:380,h:200,fill:'#f5f3ff',rx:12}),t('Pain Point #1',{left:80,top:138,fs:16,fw:'600',fill:'#7c3aed',width:340}),t('Describe the core frustration your customers face every day.',{left:80,top:165,fs:13,fill:'#4b5068',width:340}),r({left:480,top:118,w:420,h:200,fill:'#f8f9fb',rx:12}),t('Pain Point #2',{left:500,top:138,fs:16,fw:'600',width:380}),t('The secondary problem that compounds the first.',{left:500,top:165,fs:13,fill:'#4b5068',width:380}),t('$XXB total addressable market with no adequate solution today.',{left:60,top:348,fs:15,fill:'#7c3aed',fw:'600',width:W-120})]),
      makePage('#fff',[r({left:0,top:0,w:W,h:4,fill:'#7c3aed'}),t('Our Solution',{left:60,top:48,fs:36,fw:'700',width:500}),r({left:60,top:118,w:250,h:190,fill:'#0d0f1a',rx:14}),t('01',{left:80,top:138,fs:32,fw:'700',fill:'#7c3aed',width:210,ff:'DM Mono'}),t('Feature One',{left:80,top:182,fs:16,fw:'600',fill:'#fff',width:210}),t('What it does and why it matters.',{left:80,top:206,fs:12,fill:'#8b91a8',width:210}),r({left:350,top:118,w:250,h:190,fill:'#f5f3ff',rx:14}),t('02',{left:370,top:138,fs:32,fw:'700',fill:'#7c3aed',width:210,ff:'DM Mono'}),t('Feature Two',{left:370,top:182,fs:16,fw:'600',width:210}),t('What it does and why it matters.',{left:370,top:206,fs:12,fill:'#4b5068',width:210}),r({left:640,top:118,w:250,h:190,fill:'#f8f9fb',rx:14}),t('03',{left:660,top:138,fs:32,fw:'700',fill:'#7c3aed',width:210,ff:'DM Mono'}),t('Feature Three',{left:660,top:182,fs:16,fw:'600',width:210}),t('What it does and why it matters.',{left:660,top:206,fs:12,fill:'#4b5068',width:210})]),
      makePage('#fff',[r({left:0,top:0,w:W,h:4,fill:'#7c3aed'}),t('Traction',{left:60,top:48,fs:36,fw:'700',width:500}),r({left:60,top:118,w:220,h:150,fill:'#f5f3ff',rx:14}),t('$0M',{left:80,top:140,fs:44,fw:'700',fill:'#7c3aed',width:180,ff:'DM Sans'}),t('ARR',{left:80,top:194,fs:12,fill:'#8b91a8',width:180}),r({left:320,top:118,w:220,h:150,fill:'#f0fdf4',rx:14}),t('0K',{left:340,top:140,fs:44,fw:'700',fill:'#059669',width:180}),t('ACTIVE USERS',{left:340,top:194,fs:12,fill:'#8b91a8',width:180}),r({left:580,top:118,w:220,h:150,fill:'#eff6ff',rx:14}),t('0%',{left:600,top:140,fs:44,fw:'700',fill:'#2563eb',width:180}),t('MOM GROWTH',{left:600,top:194,fs:12,fill:'#8b91a8',width:180})]),
      makePage('#fff',[r({left:0,top:0,w:W,h:4,fill:'#7c3aed'}),t('The Ask',{left:60,top:48,fs:36,fw:'700',width:500}),r({left:60,top:118,w:W-120,h:70,fill:'#0d0f1a',rx:10}),t('Raising $X.XM Seed Round',{left:80,top:138,fs:28,fw:'700',fill:'#fff',width:700}),t('40% Product & Engineering',{left:60,top:220,fs:14,fill:'#0d0f1a',fw:'600',width:270}),t('30% Sales & Growth',{left:60,top:244,fs:14,fill:'#4b5068',width:270}),t('20% Marketing',{left:360,top:220,fs:14,fill:'#0d0f1a',fw:'600',width:270}),t('10% Operations',{left:360,top:244,fs:14,fill:'#4b5068',width:270})]),
      makePage('#7c3aed',[t('Thank You',{left:60,top:140,fs:72,fw:'700',fill:'#fff',width:W-120}),t("Let's build something great.",{left:60,top:242,fs:20,fill:'#ede9fe',width:600}),t('hello@backread.com',{left:60,top:H-80,fs:14,fill:'#c4b5fd',ff:'DM Mono'})]),
    ];
    case 'proposal': return [
      makePage('#f8f9fb',[r({w:320,h:H,fill:'#0d0f1a'}),t('PROJECT\nPROPOSAL',{left:40,top:60,fs:28,fw:'700',fill:'#fff',width:240}),t('Prepared for:',{left:40,top:220,fs:11,fill:'#4b5068',width:240}),t('Client Name',{left:40,top:240,fs:17,fw:'600',fill:'#fff',width:240}),t('Month YYYY',{left:40,top:H-60,fs:11,fill:'#4b5068',ff:'DM Mono',width:240}),t('Proposal Title\nGoes Here',{left:360,top:100,fs:42,fw:'700',fill:'#0d0f1a',width:540}),t('A compelling one-sentence summary of this proposal.',{left:360,top:230,fs:15,fill:'#4b5068',width:540})]),
      makePage('#fff',[r({left:0,top:0,w:4,h:H,fill:'#2563eb'}),t('Executive Summary',{left:40,top:48,fs:32,fw:'700',width:W-80}),t('Describe the project context and why this proposal is ideal.',{left:40,top:118,fs:15,fill:'#4b5068',width:W-80}),r({left:40,top:240,w:(W-100)/2,h:120,fill:'#eff6ff',rx:12}),t('Challenge',{left:60,top:258,fs:15,fw:'600',fill:'#2563eb',width:400}),t('Define the core problem clearly.',{left:60,top:282,fs:13,fill:'#4b5068',width:400}),r({left:(W-100)/2+60,top:240,w:(W-100)/2,h:120,fill:'#f0fdf4',rx:12}),t('Solution',{left:(W-100)/2+80,top:258,fs:15,fw:'600',fill:'#059669',width:400}),t('How this proposal solves it.',{left:(W-100)/2+80,top:282,fs:13,fill:'#4b5068',width:400})]),
    ];
    case 'report': return [
      makePage('#f8f9fb',[r({left:0,top:0,w:6,h:H,fill:'#059669'}),t('QUARTERLY\nREPORT',{left:40,top:60,fs:52,fw:'700',fill:'#0d0f1a',width:560}),t('Q1 2025',{left:40,top:256,fs:16,fill:'#059669',fw:'600',ff:'DM Mono'}),t('Backread Platform · Confidential',{left:40,top:H-50,fs:11,fill:'#8b91a8',ff:'DM Mono',width:500})]),
      makePage('#fff',[r({left:0,top:0,w:4,h:H,fill:'#059669'}),t('Key Metrics',{left:40,top:48,fs:32,fw:'700',width:W-80}),r({left:40,top:110,w:200,h:140,fill:'#ecfdf5',rx:12}),t('0',{left:60,top:128,fs:52,fw:'700',fill:'#059669',width:160}),t('TOTAL VIEWS',{left:60,top:190,fs:10,fill:'#4b5068',width:160,ff:'DM Mono'}),r({left:260,top:110,w:200,h:140,fill:'#eff6ff',rx:12}),t('0:00',{left:280,top:128,fs:52,fw:'700',fill:'#2563eb',width:160}),t('AVG READ TIME',{left:280,top:190,fs:10,fill:'#4b5068',width:160,ff:'DM Mono'}),r({left:480,top:110,w:200,h:140,fill:'#fdf2f8',rx:12}),t('0%',{left:500,top:128,fs:52,fw:'700',fill:'#db2777',width:160}),t('COMPLETION',{left:500,top:190,fs:10,fill:'#4b5068',width:160,ff:'DM Mono'})]),
    ];
    case 'onepager':
    default: return [
      makePage('#fff',[r({left:0,top:0,w:W,h:6,fill:'#d97706'}),t('BACKREAD',{left:40,top:36,fs:16,fw:'700',fill:'#d97706',width:300,ff:'DM Mono'}),t('Your Headline\nGoes Here',{left:40,top:88,fs:46,fw:'700',fill:'#0d0f1a',width:W/2-60}),t('A compelling one-sentence pitch that makes someone stop scrolling.',{left:40,top:208,fs:15,fill:'#4b5068',width:W/2-60}),r({left:40,top:258,w:130,h:42,fill:'#d97706',rx:8}),t('Get Started →',{left:52,top:268,fs:13,fw:'600',fill:'#fff',width:106}),t('Key Benefit One',{left:40,top:340,fs:15,fw:'600',fill:'#d97706'}),t('Short punchy description of your first benefit.',{left:40,top:364,fs:13,fill:'#4b5068',width:W/2-60}),r({left:W/2+20,top:66,w:W/2-60,h:H-140,fill:'#fffbeb',rx:18})])
    ];
  }
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
  fc = new fabric.Canvas('main-canvas', {width: CANVAS_W, height: CANVAS_H, backgroundColor:'#fff', selection:true, preserveObjectStacking:true});

  // Events
  fc.on('selection:created', onSelect);
  fc.on('selection:updated', onSelect);
  fc.on('selection:cleared', () => { document.getElementById('right-panel').classList.remove('open'); });
  fc.on('object:modified', scheduleAutoSave);
  fc.on('object:added', scheduleAutoSave);
  fc.on('object:removed', scheduleAutoSave);

  // Build template grid
  buildTplGrid();

  // Show template modal
  document.getElementById('templateModal').style.display = 'flex';
  applyZoom();

  // Keyboard shortcuts
  window.addEventListener('keydown', onKey);
  window.addEventListener('click', (e) => {
    if (!e.target.closest('#emojiBtn') && !e.target.closest('#emojiPicker')) {
      document.getElementById('emojiPicker').style.display = 'none';
    }
  });

  buildShareUI();
});

function buildTplGrid() {
  const grid = document.getElementById('tplGrid');
  grid.innerHTML = TEMPLATES.map(t => `
    <button class="tpl-card" onclick="applyTemplate('${t.id}')" style="--tpl-bg:${t.bg}">
      <div class="tpl-card-inner">
        <span class="tpl-emoji">${t.emoji}</span>
        <div class="tpl-name">${t.name}</div>
        <div class="tpl-desc">${t.desc}</div>
        <span class="tpl-pages" style="color:${t.accent}">${t.pages} page${t.pages>1?'s':''}</span>
      </div>
    </button>
  `).join('');
}

function applyTemplate(id) {
  const built = buildTemplate(id);
  pages = built;
  currentPage = 0;
  document.getElementById('templateModal').style.display = 'none';
  document.getElementById('cancelTplBtn').style.display = 'inline-block';
  loadPage(0);
  renderPageStrip();
  applyZoom();
}

function startBlank() {
  pages = [makePage('#fff',[])];
  currentPage = 0;
  document.getElementById('templateModal').style.display = 'none';
  document.getElementById('cancelTplBtn').style.display = 'inline-block';
  loadPage(0);
  renderPageStrip();
  applyZoom();
}

// ============================================================
// PAGE MANAGEMENT
// ============================================================
function loadPage(idx) {
  if (!fc) return;
  fc.loadFromJSON(pages[idx], () => {
    fc.renderAll();
    updatePageNav();
    document.getElementById('bgColor').value = rgbToHex(fc.backgroundColor || '#f0f1f5');
  });
}

function saveCurrent() {
  if (!fc) return;
  pages[currentPage] = fc.toJSON();
}

function switchPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  saveCurrent();
  currentPage = idx;
  loadPage(idx);
  renderPageStrip();
}

function addPage() {
  saveCurrent();
  const blank = makePage('#fff', []);
  const newIdx = currentPage + 1;
  pages.splice(newIdx, 0, blank);
  currentPage = newIdx;
  fc.clear();
  fc.backgroundColor = '#fff';
  fc.renderAll();
  renderPageStrip();
  updatePageNav();
  scheduleAutoSave();
}

function removePage(idx) {
  if (pages.length <= 1) return;
  pages.splice(idx, 1);
  const newIdx = Math.min(currentPage, pages.length - 1);
  currentPage = newIdx;
  loadPage(newIdx);
  renderPageStrip();
  scheduleAutoSave();
}

function renderPageStrip() {
  const list = document.getElementById('pageList');
  list.innerHTML = pages.map((p, i) => `
    <div class="ps-page${i === currentPage ? ' active' : ''}" onclick="switchPage(${i})">
      <div class="ps-page-thumb" style="background:${p.background||'#fff'}"></div>
      <div class="ps-page-footer">
        <span class="ps-page-num">${i+1}</span>
        ${pages.length > 1 ? `<button class="ps-page-del" onclick="event.stopPropagation();removePage(${i})">×</button>` : ''}
      </div>
    </div>
  `).join('');
  const count = pages.length;
  document.getElementById('pageCount').textContent = `${count} page${count>1?'s':''}`;
  updatePageNav();
}

function updatePageNav() {
  const nav = document.getElementById('page-nav');
  nav.style.display = pages.length > 1 ? 'flex' : 'none';
  document.getElementById('pageNavText').textContent = `${currentPage+1} / ${pages.length}`;
  document.getElementById('prevBtn').disabled = currentPage === 0;
  document.getElementById('nextBtn').disabled = currentPage === pages.length - 1;
}

// ============================================================
// TOOLS & DRAWING
// ============================================================
function setTool(tool) {
  activeTool = tool;
  ['select','text','rect','circle','triangle','draw'].forEach(id => {
    const el = document.getElementById('tool-'+id);
    if (el) el.classList.toggle('active', id === tool);
  });
  if (fc) {
    fc.isDrawingMode = (tool === 'draw');
    if (fc.freeDrawingBrush) {
      fc.freeDrawingBrush.width = 3;
      fc.freeDrawingBrush.color = document.getElementById('textColor').value;
    }
  }
}

function addText() {
  if (!fc) return;
  const tb = new fabric.Textbox('Click to edit', {
    left:120, top:120, width:300, fontSize:24,
    fontFamily: document.getElementById('fontFamily').value,
    fill: document.getElementById('textColor').value,
    editable:true
  });
  fc.add(tb);
  fc.setActiveObject(tb);
  fc.renderAll();
  setTool('select');
}

function addShape(type) {
  if (!fc) return;
  const fill = document.getElementById('fillColor').value;
  let shape;
  if (type === 'rect') shape = new fabric.Rect({left:120,top:120,width:200,height:120,fill,rx:8,ry:8});
  else if (type === 'circle') shape = new fabric.Circle({left:120,top:120,radius:70,fill});
  else if (type === 'triangle') shape = new fabric.Triangle({left:120,top:120,width:140,height:140,fill});
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.renderAll();
  setTool('select');
}

function deleteSelected() {
  if (!fc) return;
  fc.getActiveObjects().forEach(o => fc.remove(o));
  fc.discardActiveObject();
  fc.renderAll();
  scheduleAutoSave();
}

function duplicate() {
  if (!fc) return;
  const obj = fc.getActiveObject();
  if (!obj) return;
  obj.clone(c => { c.set({left:c.left+20,top:c.top+20}); fc.add(c); fc.setActiveObject(c); fc.renderAll(); });
}

function layerUp() {
  if (!fc) return;
  const o = fc.getActiveObject();
  if (o) { fc.bringToFront(o); fc.renderAll(); }
}

function layerDown() {
  if (!fc) return;
  const o = fc.getActiveObject();
  if (o) { fc.sendToBack(o); fc.renderAll(); }
}

function alignObj(dir) {
  if (!fc) return;
  const o = fc.getActiveObject();
  if (!o) return;
  if (dir === 'left') o.set('left', 0);
  else if (dir === 'center') o.set('left', (CANVAS_W - o.getScaledWidth()) / 2);
  fc.renderAll();
}

function uploadImage(e) {
  const file = e.target.files[0];
  if (!file || !fc) return;
  const reader = new FileReader();
  reader.onload = ev => {
    fabric.Image.fromURL(ev.target.result, img => {
      const scale = Math.min(400/img.width, 300/img.height, 1);
      img.set({left:120,top:120,scaleX:scale,scaleY:scale});
      fc.add(img); fc.setActiveObject(img); fc.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-overlay').style.display = 'none';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) uploadImage({target:{files:[file]}});
}

// ============================================================
// FORMATTING
// ============================================================
function updateFont() {
  const obj = fc?.getActiveObject();
  if (obj) { obj.set('fontFamily', document.getElementById('fontFamily').value); fc.renderAll(); }
}

function updateFontSize() {
  const v = parseInt(document.getElementById('fontSize').value);
  const obj = fc?.getActiveObject();
  if (obj) { obj.set('fontSize', v); fc.renderAll(); }
}

function toggleFormat(prop, onVal, offVal) {
  const obj = fc?.getActiveObject();
  if (!obj) return;
  const cur = obj[prop];
  obj.set(prop, cur === onVal ? offVal : onVal);
  fc.renderAll();
  updateFormatBtns(obj);
}

function toggleUnderline() {
  const obj = fc?.getActiveObject();
  if (!obj) return;
  obj.set('underline', !obj.underline);
  fc.renderAll();
}

function applyColor(type) {
  const obj = fc?.getActiveObject();
  if (!obj) return;
  if (type === 'text') obj.set('fill', document.getElementById('textColor').value);
  else if (type === 'fill') obj.set('fill', document.getElementById('fillColor').value);
  fc.renderAll();
}

function applyBg() {
  if (!fc) return;
  fc.backgroundColor = document.getElementById('bgColor').value;
  fc.renderAll();
}

function onSelect(e) {
  const obj = e.selected?.[0];
  if (!obj) return;
  // Update toolbar
  if (obj.fontSize) document.getElementById('fontSize').value = obj.fontSize;
  if (obj.fontFamily) document.getElementById('fontFamily').value = obj.fontFamily;
  updateFormatBtns(obj);
  // Show props panel
  renderPropsPanel(obj);
  document.getElementById('right-panel').classList.add('open');
}

function updateFormatBtns(obj) {
  document.getElementById('fmt-bold').classList.toggle('on', obj.fontWeight === 'bold');
  document.getElementById('fmt-italic').classList.toggle('on', obj.fontStyle === 'italic');
  document.getElementById('fmt-under').classList.toggle('on', !!obj.underline);
}

function renderPropsPanel(obj) {
  const panel = document.getElementById('propPanel');
  const op = Math.round((obj.opacity ?? 1) * 100);
  const rx = obj.rx ?? 0;
  panel.innerHTML = `
    <div class="rp-prop"><label>X</label><input class="rp-num" type="number" value="${Math.round(obj.left??0)}" onchange="setProp('left',this.value)" /></div>
    <div class="rp-prop"><label>Y</label><input class="rp-num" type="number" value="${Math.round(obj.top??0)}" onchange="setProp('top',this.value)" /></div>
    ${obj.width?`<div class="rp-prop"><label>Width</label><input class="rp-num" type="number" value="${Math.round(obj.width??0)}" onchange="setProp('width',this.value)" /></div>`:''}
    <div class="rp-prop">
      <label>Opacity <span style="float:right;color:var(--text)">${op}%</span></label>
      <input class="rp-range" type="range" min="0" max="100" value="${op}" oninput="setProp('opacity',this.value/100);this.previousElementSibling.querySelector('span').textContent=this.value+'%'" />
    </div>
    ${obj.type==='rect'?`<div class="rp-prop"><label>Radius</label><input class="rp-num" type="number" value="${rx}" onchange="setRoundness(this.value)" /></div>`:''}
    ${obj.fontSize?`<div class="rp-prop"><label>Font size</label><input class="rp-num" type="number" value="${obj.fontSize}" onchange="setProp('fontSize',this.value)" /></div>`:''}
  `;
}

function setProp(prop, val) {
  const obj = fc?.getActiveObject();
  if (obj) { obj.set(prop, parseFloat(val)); fc.renderAll(); scheduleAutoSave(); }
}

function setRoundness(val) {
  const obj = fc?.getActiveObject();
  if (obj) { obj.set('rx', parseFloat(val)); obj.set('ry', parseFloat(val)); fc.renderAll(); }
}

// ============================================================
// ZOOM
// ============================================================
function applyZoom() {
  const wrap = document.getElementById('canvas-wrap');
  wrap.style.transform = `scale(${zoom})`;
  wrap.style.transformOrigin = 'center center';
  document.getElementById('zoomVal').textContent = Math.round(zoom*100)+'%';
}

function changeZoom(delta) {
  zoom = Math.max(0.2, Math.min(2, zoom + delta));
  applyZoom();
}

// ============================================================
// AUTO-SAVE
// ============================================================
function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(doSave, 1500);
}

async function doSave() {
  saveCurrent();
  const el = document.getElementById('saveStatus');
  el.textContent = '● Saving…'; el.className = 'tb-save saving';
  await new Promise(r => setTimeout(r, 600));
  el.textContent = `✓ Saved ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
  el.className = 'tb-save';
}

// ============================================================
// KEYBOARD
// ============================================================
function onKey(e) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if ((e.metaKey||e.ctrlKey) && e.key === 's') { e.preventDefault(); doSave(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && fc?.getActiveObject()) deleteSelected();
  if (e.key === 'v' || e.key === 'V') setTool('select');
  if (e.key === 't' || e.key === 'T') addText();
}

// ============================================================
// EMOJI
// ============================================================
function toggleEmoji() {
  const p = document.getElementById('emojiPicker');
  p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}

function setEmoji(btn) {
  document.getElementById('emojiBtn').textContent = btn.textContent;
  document.getElementById('emojiPicker').style.display = 'none';
}

// ============================================================
// SIDE PANEL
// ============================================================
function setSidePanel(id) {
  document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

// ============================================================
// TEMPLATE MODAL
// ============================================================
function toggleTemplates() {
  const m = document.getElementById('templateModal');
  m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  if (pages.length > 0) document.getElementById('cancelTplBtn').style.display = 'inline-block';
}

// ============================================================
// PUBLISH
// ============================================================
function publishDoc() {
  const el = document.getElementById('docStatus');
  el.textContent = 'LIVE'; el.className = 'tb-status live';
  const btn = document.querySelector('.tb-btn.primary');
  btn.textContent = 'Published ✓';
  setTimeout(() => { btn.textContent = 'Publish'; }, 2000);
}

// ============================================================
// PRESENT
// ============================================================
function presentMode() {
  const modal = document.getElementById('presentModal');
  modal.classList.add('open');
  const wrap = document.getElementById('present-canvas-wrap');
  wrap.innerHTML = '';
  const canvas = document.createElement('canvas');
  const scale = Math.min(window.innerWidth*0.9/CANVAS_W, window.innerHeight*0.85/CANVAS_H);
  canvas.width = CANVAS_W * scale;
  canvas.height = CANVAS_H * scale;
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  // Render current page
  const pCanvas = document.getElementById('main-canvas');
  ctx.drawImage(pCanvas, 0, 0);
}

function closePresentMode() {
  document.getElementById('presentModal').classList.remove('open');
}

// ============================================================
// SHARE DRAWER
// ============================================================
function toggleShare() {
  const drawer = document.getElementById('share-drawer');
  shareOpen = !shareOpen;
  drawer.classList.toggle('open', shareOpen);
}

function buildShareUI() {
  renderShareLinks();
}

function renderShareLinks() {
  const body = document.getElementById('shareBody');
  const linksLabel = document.getElementById('linksLabel');
  const linksList = document.getElementById('linksList');
  const newLinkArea = document.getElementById('newLinkArea');
  document.getElementById('shareSubtitle').textContent = `${shareLinks.length} link${shareLinks.length!==1?'s':''} created`;

  if (shareLinks.length > 0) {
    linksLabel.style.display = 'block';
    linksList.innerHTML = shareLinks.map((link, i) => `
      <div class="share-link-card">
        <div class="slc-top">
          <span class="slc-name">${link.label}</span>
          <span class="slc-status ${link.active?'on':'off'}">${link.active?'Active':'Off'}</span>
        </div>
        <div class="slc-url-row">
          <div class="slc-url">${link.url}</div>
          <button class="slc-copy" id="copy-${i}" onclick="copyLink(${i})">Copy</button>
        </div>
        <div class="slc-meta">
          <span>👁 ${link.views} views</span>
          ${link.email?'<span>📧 Email req.</span>':''}
          ${link.password?'<span>🔒 Password</span>':''}
        </div>
        <div class="slc-actions">
          <button class="slc-toggle ${link.active?'disable':'enable'}" onclick="toggleLink(${i})">${link.active?'Disable link':'Enable link'}</button>
        </div>
      </div>
    `).join('');
  } else {
    linksLabel.style.display = 'none';
    linksList.innerHTML = '';
  }

  if (showNewLinkForm) {
    newLinkArea.innerHTML = `
      <div class="new-link-form solid">
        <div class="nlf-title">New share link</div>
        <div class="nlf-field"><label>Link label</label><input type="text" id="nlf-label" placeholder="e.g. Sequoia meeting" /></div>
        <div class="nlf-field"><label>Password (optional)</label><input type="password" id="nlf-pw" placeholder="Leave empty for no password" /></div>
        <div class="nlf-toggle-row">
          <span class="nlf-toggle-label">Require email to view</span>
          <label class="toggle-sw"><input type="checkbox" id="nlf-email"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
        </div>
        <div class="nlf-toggle-row">
          <span class="nlf-toggle-label">Allow download</span>
          <label class="toggle-sw"><input type="checkbox" id="nlf-dl"><div class="toggle-track"></div><div class="toggle-thumb"></div></label>
        </div>
        <div class="nlf-actions">
          <button class="nlf-btn primary" onclick="createLink()">Create link</button>
          <button class="nlf-btn ghost" onclick="showNewLinkForm=false;renderShareLinks()">Cancel</button>
        </div>
      </div>
    `;
  } else {
    newLinkArea.innerHTML = `<button class="add-link-btn" onclick="showNewLinkForm=true;renderShareLinks()"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Create new link</button>`;
  }
}

function createLink() {
  const label = document.getElementById('nlf-label').value || 'Share link';
  const pw = document.getElementById('nlf-pw').value;
  const email = document.getElementById('nlf-email').checked;
  const token = Math.random().toString(36).slice(2,16);
  shareLinks.push({ label, url:`https://app.backread.com/s/${token}`, active:true, views:0, email, password:pw, download: document.getElementById('nlf-dl').checked });
  showNewLinkForm = false;
  renderShareLinks();
}

function copyLink(i) {
  const url = shareLinks[i].url;
  navigator.clipboard.writeText(url).catch(()=>{});
  const btn = document.getElementById(`copy-${i}`);
  btn.textContent = '✓ Copied'; btn.classList.add('copied');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
}

function toggleLink(i) {
  shareLinks[i].active = !shareLinks[i].active;
  renderShareLinks();
}

// ============================================================
// UTILS
// ============================================================
function rgbToHex(color) {
  if (!color) return '#f0f1f5';
  if (color.startsWith('#')) return color;
  const m = color.match(/\d+/g);
  if (!m) return '#f0f1f5';
  return '#' + m.slice(0,3).map(x => (+x).toString(16).padStart(2,'0')).join('');
}
</script>
</body>
</html>