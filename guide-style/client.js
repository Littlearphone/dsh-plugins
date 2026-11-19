/**
 * Guide style — restyles the right sidebar's guide page (the "start page") as a
 * centred grid of square tiles. It is a presentation-only bundle: no Host half,
 * no strings, one global stylesheet mounted on the frame overlay.
 */
window.__ModuleLoader__.load({
  id: '@local/guide-style',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

const GUIDE_CSS = `
[data-sidebar-right-guide][data-sidebar-right-guide]{
--dsh-guide-tile-min:88px;
--dsh-guide-tile-max:112px;
--dsh-guide-tile-gap:12px;
--dsh-guide-sheen:rgba(255,255,255,.30);
box-sizing:border-box;
display:grid;
/* fit-content, not 100%: the track count must follow the number of cards, not
   the panel width. With a full-width box auto-fit sizes tracks from the panel
   (four tracks in a four-track-wide panel) and a shorter row looks left-aligned;
   shrinking the box to its content keeps three cards three tracks, and
   margin-inline:auto centres the group. */
width:fit-content;
min-width:0;
grid-template-columns:repeat(auto-fit,minmax(var(--dsh-guide-tile-min),var(--dsh-guide-tile-max)));
justify-content:center;
align-content:center;
gap:var(--dsh-guide-tile-gap);
min-height:100%;
padding:24px 20px;
max-width:min(100%,calc(4 * var(--dsh-guide-tile-max) + 3 * var(--dsh-guide-tile-gap) + 40px));
margin-inline:auto;
}
[data-sidebar-right-guide][data-sidebar-right-guide]::after{content:none;}
[data-sidebar-right-guide] > span[aria-hidden="true"]{grid-column:1/-1;justify-self:center;margin:0 0 6px;}
body[data-ds-dark-theme] [data-sidebar-right-guide][data-sidebar-right-guide]{--dsh-guide-sheen:rgba(255,255,255,.12);}
/* One tile for every card. The shell sits on the grid item, so a provider's
   card (the terminal ships one) and the guide's own More card are framed
   exactly like ours — no square/wide mixture. */
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]){
box-sizing:border-box;
position:relative;
min-width:0;
min-height:0;
display:flex;
aspect-ratio:1/1;
border:.5px solid var(--dsw-alias-border-l1);
border-radius:18px;
background-color:var(--dsw-alias-bg-layer-1);
background-image:linear-gradient(135deg,transparent 18%,var(--dsh-guide-sheen) 44%,rgba(255,255,255,.05) 56%,transparent 74%);
box-shadow:inset 0 1px 0 var(--dsh-guide-sheen),0 1px 2px rgba(0,0,0,.05);
overflow:hidden;
transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease;
}
@media (hover:hover){
[data-sidebar-right-guide] > *:not(span[aria-hidden="true"]):hover{
transform:translateY(-2px);
border-color:var(--dsw-alias-brand-primary);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px rgba(76,111,231,.22),inset 0 1px 0 var(--dsh-guide-sheen);
box-shadow:0 0 0 1px var(--dsw-alias-brand-primary),0 8px 22px color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent),inset 0 1px 0 var(--dsh-guide-sheen);
}
}
/* The card inside fills the tile and is laid out like the most complex one:
   icon on its own row, then a single-line title. The same rule is expressed
   for the card root at the tile's child level and for a keyed entry card at
   any depth, so a slot wrapper between them changes nothing. */
[data-sidebar-right-guide] > * > *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry]{
box-sizing:border-box;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:8px;
width:100%;
height:100%;
min-width:0;
min-height:0;
padding:10px 8px;
text-align:center;
border:0;
border-radius:inherit;
background:transparent;
box-shadow:none;
color:var(--dsw-alias-label-primary);
font:inherit;
}
[data-sidebar-right-guide] > * > * > span:first-of-type,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type{width:34px;height:34px;flex:none;color:var(--dsw-alias-label-secondary);}
[data-sidebar-right-guide] > * > * > span:first-of-type svg,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:first-of-type svg{width:100%;height:100%;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2){display:flex;flex:0 0 auto;flex-direction:column;align-items:center;gap:2px;width:100%;min-width:0;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:first-child,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:first-child{min-width:0;max-width:100%;font-size:12px;line-height:1.35;}
[data-sidebar-right-guide] > * > * > span:nth-of-type(2) > *:not(:first-child),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(2) > *:not(:first-child){display:none;}
/* The shortcut rides under the title as a quiet third line instead of being
   hidden: the tile has the room, and hiding it left the space looking reserved. */
[data-sidebar-right-guide] > * > * > span:nth-of-type(3),
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3){
display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:2px;
width:100%;min-width:0;overflow:hidden;white-space:nowrap;
font-size:9px;line-height:1;color:var(--dsw-alias-label-secondary);
}
[data-sidebar-right-guide] > * > * > span:nth-of-type(3) *,
[data-sidebar-right-guide] [data-sidebar-right-guide-entry] > span:nth-of-type(3) *,
[data-sidebar-right-guide] kbd{
border:0;background:transparent;box-shadow:none;padding:0;margin:0;
min-width:0;font:inherit;font-size:9px;line-height:1;color:inherit;
}
`;

/**
 * The guide page restyle is a global sheet, so it rides a frame-wide seat
 * that renders nothing but the style element.
 */
function GuideStyle() {
  return h('style', null, GUIDE_CSS);
}


    return {
      inject: ['slots'],
      apply(ctx) {
        const slots = ctx.get('slots');
        if (slots === undefined) {
          console.error('[guide-style] the slot registry is unavailable');
          return;
        }
        slots.inject('shell.overlay', () =>
          slots.register({ name: 'shell.overlay', id: 'guide-style', order: 900 }, GuideStyle),
        );
      },
    };
  },
});
