export const SOCIAL_TEMPLATES = {
  style1: {
    '9x16': [
      { type: 'rect', x: 0, y: 0, w: 1, h: 1, color: '#000' },
      { type: 'image', x: 0.05, y: 0.05, w: 0.3, h: 0.3, src: 'homeLogo', mode: 'contain' },
      { type: 'text', x: 0.5, y: 0.8, w: 0.9, h: 0.1, text: 'playerName', color: '#fff', align: 'center', font: '48px sans-serif' }
    ],
    '1x1': [
      { type: 'rect', x:0, y:0, w:1, h:1, color:'#000' },
      { type: 'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'playerName', color:'#fff', align:'center', font:'32px sans-serif' }
    ],
    '2x3': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#000' },
      { type:'text', x:0.5, y:0.7, w:0.9, h:0.2, text:'playerName', color:'#fff', align:'center', font:'40px sans-serif' }
    ]
  },
  style2: {
    '9x16': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#1a1a1a' },
      { type:'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'eventType', color:'#e16316', align:'center', font:'60px sans-serif' }
    ],
    '1x1': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#1a1a1a' },
      { type:'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'eventType', color:'#e16316', align:'center', font:'40px sans-serif' }
    ],
    '2x3': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#1a1a1a' },
      { type:'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'eventType', color:'#e16316', align:'center', font:'50px sans-serif' }
    ]
  },
  style3: {
    '9x16': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#ffffff' },
      { type:'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'scoreline', color:'#000', align:'center', font:'64px sans-serif' }
    ],
    '1x1': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#ffffff' },
      { type:'text', x:0.5, y:0.5, w:0.9, h:0.2, text:'scoreline', color:'#000', align:'center', font:'40px sans-serif' }
    ],
    '2x3': [
      { type:'rect', x:0, y:0, w:1, h:1, color:'#ffffff' },
      { type:'text', x:0.5, y:0.6, w:0.9, h:0.2, text:'scoreline', color:'#000', align:'center', font:'50px sans-serif' }
    ]
  }
};
