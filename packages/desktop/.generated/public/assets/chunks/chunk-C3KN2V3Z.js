import{a as Mt,b as Ut}from"/public/assets/chunks/chunk-XZXHPX2N.js";import{b as Vt}from"/public/assets/chunks/chunk-O7GVW33Z.js";import{G as Yt,O as Ft}from"/public/assets/chunks/chunk-4GJWQWD5.js";import{N as P,S as Ot,T as Nt,U as wt,V as $t,W as Pt,X as Bt,Y as Gt,Z as x,h as d,j as m}from"/public/assets/chunks/chunk-2ZRVNTY6.js";import{f as D}from"/public/assets/chunks/chunk-HA3VNNOB.js";var Dt=function(){var t=d(function($,l,c,a){for(c=c||{},a=$.length;a--;c[$[a]]=l);return c},"o"),e=[1,2],s=[1,3],n=[1,4],o=[2,4],p=[1,9],r=[1,11],u=[1,16],f=[1,17],g=[1,18],_=[1,19],E=[1,32],I=[1,20],S=[1,21],L=[1,22],R=[1,23],G=[1,24],Y=[1,26],N=[1,27],w=[1,28],Z=[1,29],tt=[1,30],et=[1,31],st=[1,34],it=[1,35],rt=[1,36],at=[1,37],z=[1,33],y=[1,4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,42,45,48,49,50,51,54],nt=[1,4,5,14,15,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,42,45,48,49,50,51,54],Lt=[4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,42,45,48,49,50,51,54],yt={trace:d(function(){},"trace"),yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,styleStatement:11,cssClassStatement:12,idStatement:13,DESCR:14,"-->":15,HIDE_EMPTY:16,scale:17,WIDTH:18,COMPOSIT_STATE:19,STRUCT_START:20,STRUCT_STOP:21,STATE_DESCR:22,AS:23,ID:24,FORK:25,JOIN:26,CHOICE:27,CONCURRENT:28,note:29,notePosition:30,NOTE_TEXT:31,direction:32,acc_title:33,acc_title_value:34,acc_descr:35,acc_descr_value:36,acc_descr_multiline_value:37,classDef:38,CLASSDEF_ID:39,CLASSDEF_STYLEOPTS:40,DEFAULT:41,style:42,STYLE_IDS:43,STYLEDEF_STYLEOPTS:44,class:45,CLASSENTITY_IDS:46,STYLECLASS:47,direction_tb:48,direction_bt:49,direction_rl:50,direction_lr:51,eol:52,";":53,EDGE_STATE:54,STYLE_SEPARATOR:55,left_of:56,right_of:57,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",14:"DESCR",15:"-->",16:"HIDE_EMPTY",17:"scale",18:"WIDTH",19:"COMPOSIT_STATE",20:"STRUCT_START",21:"STRUCT_STOP",22:"STATE_DESCR",23:"AS",24:"ID",25:"FORK",26:"JOIN",27:"CHOICE",28:"CONCURRENT",29:"note",31:"NOTE_TEXT",33:"acc_title",34:"acc_title_value",35:"acc_descr",36:"acc_descr_value",37:"acc_descr_multiline_value",38:"classDef",39:"CLASSDEF_ID",40:"CLASSDEF_STYLEOPTS",41:"DEFAULT",42:"style",43:"STYLE_IDS",44:"STYLEDEF_STYLEOPTS",45:"class",46:"CLASSENTITY_IDS",47:"STYLECLASS",48:"direction_tb",49:"direction_bt",50:"direction_rl",51:"direction_lr",53:";",54:"EDGE_STATE",55:"STYLE_SEPARATOR",56:"left_of",57:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[10,3],[10,3],[11,3],[12,3],[32,1],[32,1],[32,1],[32,1],[52,1],[52,1],[13,1],[13,1],[13,3],[13,3],[30,1],[30,1]],performAction:d(function(l,c,a,b,T,i,W){var h=i.length-1;switch(T){case 3:return b.setRootDoc(i[h]),i[h];break;case 4:this.$=[];break;case 5:i[h]!="nl"&&(i[h-1].push(i[h]),this.$=i[h-1]);break;case 6:case 7:this.$=i[h];break;case 8:this.$="nl";break;case 12:this.$=i[h];break;case 13:let ot=i[h-1];ot.description=b.trimColon(i[h]),this.$=ot;break;case 14:this.$={stmt:"relation",state1:i[h-2],state2:i[h]};break;case 15:let ct=b.trimColon(i[h]);this.$={stmt:"relation",state1:i[h-3],state2:i[h-1],description:ct};break;case 19:this.$={stmt:"state",id:i[h-3],type:"default",description:"",doc:i[h-1]};break;case 20:var F=i[h],j=i[h-2].trim();if(i[h].match(":")){var X=i[h].split(":");F=X[0],j=[j,X[1]]}this.$={stmt:"state",id:F,type:"default",description:j};break;case 21:this.$={stmt:"state",id:i[h-3],type:"default",description:i[h-5],doc:i[h-1]};break;case 22:this.$={stmt:"state",id:i[h],type:"fork"};break;case 23:this.$={stmt:"state",id:i[h],type:"join"};break;case 24:this.$={stmt:"state",id:i[h],type:"choice"};break;case 25:this.$={stmt:"state",id:b.getDividerId(),type:"divider"};break;case 26:this.$={stmt:"state",id:i[h-1].trim(),note:{position:i[h-2].trim(),text:i[h].trim()}};break;case 29:this.$=i[h].trim(),b.setAccTitle(this.$);break;case 30:case 31:this.$=i[h].trim(),b.setAccDescription(this.$);break;case 32:case 33:this.$={stmt:"classDef",id:i[h-1].trim(),classes:i[h].trim()};break;case 34:this.$={stmt:"style",id:i[h-1].trim(),styleClass:i[h].trim()};break;case 35:this.$={stmt:"applyClass",id:i[h-1].trim(),styleClass:i[h].trim()};break;case 36:b.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 37:b.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 38:b.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 39:b.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 42:case 43:this.$={stmt:"state",id:i[h].trim(),type:"default",description:""};break;case 44:this.$={stmt:"state",id:i[h-2].trim(),classes:[i[h].trim()],type:"default",description:""};break;case 45:this.$={stmt:"state",id:i[h-2].trim(),classes:[i[h].trim()],type:"default",description:""};break}},"anonymous"),table:[{3:1,4:e,5:s,6:n},{1:[3]},{3:5,4:e,5:s,6:n},{3:6,4:e,5:s,6:n},t([1,4,5,16,17,19,22,24,25,26,27,28,29,33,35,37,38,42,45,48,49,50,51,54],o,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:p,5:r,8:8,9:10,10:12,11:13,12:14,13:15,16:u,17:f,19:g,22:_,24:E,25:I,26:S,27:L,28:R,29:G,32:25,33:Y,35:N,37:w,38:Z,42:tt,45:et,48:st,49:it,50:rt,51:at,54:z},t(y,[2,5]),{9:38,10:12,11:13,12:14,13:15,16:u,17:f,19:g,22:_,24:E,25:I,26:S,27:L,28:R,29:G,32:25,33:Y,35:N,37:w,38:Z,42:tt,45:et,48:st,49:it,50:rt,51:at,54:z},t(y,[2,7]),t(y,[2,8]),t(y,[2,9]),t(y,[2,10]),t(y,[2,11]),t(y,[2,12],{14:[1,39],15:[1,40]}),t(y,[2,16]),{18:[1,41]},t(y,[2,18],{20:[1,42]}),{23:[1,43]},t(y,[2,22]),t(y,[2,23]),t(y,[2,24]),t(y,[2,25]),{30:44,31:[1,45],56:[1,46],57:[1,47]},t(y,[2,28]),{34:[1,48]},{36:[1,49]},t(y,[2,31]),{39:[1,50],41:[1,51]},{43:[1,52]},{46:[1,53]},t(nt,[2,42],{55:[1,54]}),t(nt,[2,43],{55:[1,55]}),t(y,[2,36]),t(y,[2,37]),t(y,[2,38]),t(y,[2,39]),t(y,[2,6]),t(y,[2,13]),{13:56,24:E,54:z},t(y,[2,17]),t(Lt,o,{7:57}),{24:[1,58]},{24:[1,59]},{23:[1,60]},{24:[2,46]},{24:[2,47]},t(y,[2,29]),t(y,[2,30]),{40:[1,61]},{40:[1,62]},{44:[1,63]},{47:[1,64]},{24:[1,65]},{24:[1,66]},t(y,[2,14],{14:[1,67]}),{4:p,5:r,8:8,9:10,10:12,11:13,12:14,13:15,16:u,17:f,19:g,21:[1,68],22:_,24:E,25:I,26:S,27:L,28:R,29:G,32:25,33:Y,35:N,37:w,38:Z,42:tt,45:et,48:st,49:it,50:rt,51:at,54:z},t(y,[2,20],{20:[1,69]}),{31:[1,70]},{24:[1,71]},t(y,[2,32]),t(y,[2,33]),t(y,[2,34]),t(y,[2,35]),t(nt,[2,44]),t(nt,[2,45]),t(y,[2,15]),t(y,[2,19]),t(Lt,o,{7:72}),t(y,[2,26]),t(y,[2,27]),{4:p,5:r,8:8,9:10,10:12,11:13,12:14,13:15,16:u,17:f,19:g,21:[1,73],22:_,24:E,25:I,26:S,27:L,28:R,29:G,32:25,33:Y,35:N,37:w,38:Z,42:tt,45:et,48:st,49:it,50:rt,51:at,54:z},t(y,[2,21])],defaultActions:{5:[2,1],6:[2,2],46:[2,46],47:[2,47]},parseError:d(function(l,c){if(c.recoverable)this.trace(l);else{var a=new Error(l);throw a.hash=c,a}},"parseError"),parse:d(function(l){var c=this,a=[0],b=[],T=[null],i=[],W=this.table,h="",F=0,j=0,X=0,ot=2,ct=1,Se=i.slice.call(arguments,1),k=Object.create(this.lexer),V={yy:{}};for(var gt in this.yy)Object.prototype.hasOwnProperty.call(this.yy,gt)&&(V.yy[gt]=this.yy[gt]);k.setInput(l,V.yy),V.yy.lexer=k,V.yy.parser=this,typeof k.yylloc>"u"&&(k.yylloc={});var bt=k.yylloc;i.push(bt);var ye=k.options&&k.options.ranges;typeof V.yy.parseError=="function"?this.parseError=V.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function ge(C){a.length=a.length-2*C,T.length=T.length-C,i.length=i.length-C}d(ge,"popStack");function It(){var C;return C=b.pop()||k.lex()||ct,typeof C!="number"&&(C instanceof Array&&(b=C,C=b.pop()),C=c.symbols_[C]||C),C}d(It,"lex");for(var v,Tt,M,A,He,_t,H={},ht,O,Rt,ut;;){if(M=a[a.length-1],this.defaultActions[M]?A=this.defaultActions[M]:((v===null||typeof v>"u")&&(v=It()),A=W[M]&&W[M][v]),typeof A>"u"||!A.length||!A[0]){var Et="";ut=[];for(ht in W[M])this.terminals_[ht]&&ht>ot&&ut.push("'"+this.terminals_[ht]+"'");k.showPosition?Et="Parse error on line "+(F+1)+`:
`+k.showPosition()+`
Expecting `+ut.join(", ")+", got '"+(this.terminals_[v]||v)+"'":Et="Parse error on line "+(F+1)+": Unexpected "+(v==ct?"end of input":"'"+(this.terminals_[v]||v)+"'"),this.parseError(Et,{text:k.match,token:this.terminals_[v]||v,line:k.yylineno,loc:bt,expected:ut})}if(A[0]instanceof Array&&A.length>1)throw new Error("Parse Error: multiple actions possible at state: "+M+", token: "+v);switch(A[0]){case 1:a.push(v),T.push(k.yytext),i.push(k.yylloc),a.push(A[1]),v=null,Tt?(v=Tt,Tt=null):(j=k.yyleng,h=k.yytext,F=k.yylineno,bt=k.yylloc,X>0&&X--);break;case 2:if(O=this.productions_[A[1]][1],H.$=T[T.length-O],H._$={first_line:i[i.length-(O||1)].first_line,last_line:i[i.length-1].last_line,first_column:i[i.length-(O||1)].first_column,last_column:i[i.length-1].last_column},ye&&(H._$.range=[i[i.length-(O||1)].range[0],i[i.length-1].range[1]]),_t=this.performAction.apply(H,[h,j,F,V.yy,A[1],T,i].concat(Se)),typeof _t<"u")return _t;O&&(a=a.slice(0,-1*O*2),T=T.slice(0,-1*O),i=i.slice(0,-1*O)),a.push(this.productions_[A[1]][0]),T.push(H.$),i.push(H._$),Rt=W[a[a.length-2]][a[a.length-1]],a.push(Rt);break;case 3:return!0}}return!0},"parse")},pe=function(){var $={EOF:1,parseError:d(function(c,a){if(this.yy.parser)this.yy.parser.parseError(c,a);else throw new Error(c)},"parseError"),setInput:d(function(l,c){return this.yy=c||this.yy||{},this._input=l,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:d(function(){var l=this._input[0];this.yytext+=l,this.yyleng++,this.offset++,this.match+=l,this.matched+=l;var c=l.match(/(?:\r\n?|\n).*/g);return c?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),l},"input"),unput:d(function(l){var c=l.length,a=l.split(/(?:\r\n?|\n)/g);this._input=l+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-c),this.offset-=c;var b=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),a.length-1&&(this.yylineno-=a.length-1);var T=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:a?(a.length===b.length?this.yylloc.first_column:0)+b[b.length-a.length].length-a[0].length:this.yylloc.first_column-c},this.options.ranges&&(this.yylloc.range=[T[0],T[0]+this.yyleng-c]),this.yyleng=this.yytext.length,this},"unput"),more:d(function(){return this._more=!0,this},"more"),reject:d(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:d(function(l){this.unput(this.match.slice(l))},"less"),pastInput:d(function(){var l=this.matched.substr(0,this.matched.length-this.match.length);return(l.length>20?"...":"")+l.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:d(function(){var l=this.match;return l.length<20&&(l+=this._input.substr(0,20-l.length)),(l.substr(0,20)+(l.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:d(function(){var l=this.pastInput(),c=new Array(l.length+1).join("-");return l+this.upcomingInput()+`
`+c+"^"},"showPosition"),test_match:d(function(l,c){var a,b,T;if(this.options.backtrack_lexer&&(T={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(T.yylloc.range=this.yylloc.range.slice(0))),b=l[0].match(/(?:\r\n?|\n).*/g),b&&(this.yylineno+=b.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:b?b[b.length-1].length-b[b.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+l[0].length},this.yytext+=l[0],this.match+=l[0],this.matches=l,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(l[0].length),this.matched+=l[0],a=this.performAction.call(this,this.yy,this,c,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),a)return a;if(this._backtrack){for(var i in T)this[i]=T[i];return!1}return!1},"test_match"),next:d(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var l,c,a,b;this._more||(this.yytext="",this.match="");for(var T=this._currentRules(),i=0;i<T.length;i++)if(a=this._input.match(this.rules[T[i]]),a&&(!c||a[0].length>c[0].length)){if(c=a,b=i,this.options.backtrack_lexer){if(l=this.test_match(a,T[i]),l!==!1)return l;if(this._backtrack){c=!1;continue}else return!1}else if(!this.options.flex)break}return c?(l=this.test_match(c,T[b]),l!==!1?l:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:d(function(){var c=this.next();return c||this.lex()},"lex"),begin:d(function(c){this.conditionStack.push(c)},"begin"),popState:d(function(){var c=this.conditionStack.length-1;return c>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:d(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:d(function(c){return c=this.conditionStack.length-1-Math.abs(c||0),c>=0?this.conditionStack[c]:"INITIAL"},"topState"),pushState:d(function(c){this.begin(c)},"pushState"),stateStackSize:d(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:d(function(c,a,b,T){var i=T;switch(b){case 0:return 41;case 1:return 48;case 2:return 49;case 3:return 50;case 4:return 51;case 5:break;case 6:break;case 7:return 5;case 8:break;case 9:break;case 10:break;case 11:break;case 12:return this.pushState("SCALE"),17;break;case 13:return 18;case 14:this.popState();break;case 15:return this.begin("acc_title"),33;break;case 16:return this.popState(),"acc_title_value";break;case 17:return this.begin("acc_descr"),35;break;case 18:return this.popState(),"acc_descr_value";break;case 19:this.begin("acc_descr_multiline");break;case 20:this.popState();break;case 21:return"acc_descr_multiline_value";case 22:return this.pushState("CLASSDEF"),38;break;case 23:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";break;case 24:return this.popState(),this.pushState("CLASSDEFID"),39;break;case 25:return this.popState(),40;break;case 26:return this.pushState("CLASS"),45;break;case 27:return this.popState(),this.pushState("CLASS_STYLE"),46;break;case 28:return this.popState(),47;break;case 29:return this.pushState("STYLE"),42;break;case 30:return this.popState(),this.pushState("STYLEDEF_STYLES"),43;break;case 31:return this.popState(),44;break;case 32:return this.pushState("SCALE"),17;break;case 33:return 18;case 34:this.popState();break;case 35:this.pushState("STATE");break;case 36:return this.popState(),a.yytext=a.yytext.slice(0,-8).trim(),25;break;case 37:return this.popState(),a.yytext=a.yytext.slice(0,-8).trim(),26;break;case 38:return this.popState(),a.yytext=a.yytext.slice(0,-10).trim(),27;break;case 39:return this.popState(),a.yytext=a.yytext.slice(0,-8).trim(),25;break;case 40:return this.popState(),a.yytext=a.yytext.slice(0,-8).trim(),26;break;case 41:return this.popState(),a.yytext=a.yytext.slice(0,-10).trim(),27;break;case 42:return 48;case 43:return 49;case 44:return 50;case 45:return 51;case 46:this.pushState("STATE_STRING");break;case 47:return this.pushState("STATE_ID"),"AS";break;case 48:return this.popState(),"ID";break;case 49:this.popState();break;case 50:return"STATE_DESCR";case 51:return 19;case 52:this.popState();break;case 53:return this.popState(),this.pushState("struct"),20;break;case 54:break;case 55:return this.popState(),21;break;case 56:break;case 57:return this.begin("NOTE"),29;break;case 58:return this.popState(),this.pushState("NOTE_ID"),56;break;case 59:return this.popState(),this.pushState("NOTE_ID"),57;break;case 60:this.popState(),this.pushState("FLOATING_NOTE");break;case 61:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";break;case 62:break;case 63:return"NOTE_TEXT";case 64:return this.popState(),"ID";break;case 65:return this.popState(),this.pushState("NOTE_TEXT"),24;break;case 66:return this.popState(),a.yytext=a.yytext.substr(2).trim(),31;break;case 67:return this.popState(),a.yytext=a.yytext.slice(0,-8).trim(),31;break;case 68:return 6;case 69:return 6;case 70:return 16;case 71:return 54;case 72:return 24;case 73:return a.yytext=a.yytext.trim(),14;break;case 74:return 15;case 75:return 28;case 76:return 55;case 77:return 5;case 78:return"INVALID"}},"anonymous"),rules:[/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:style\s+)/i,/^(?:[\w,]+\s+)/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[9,10],inclusive:!1},struct:{rules:[9,10,22,26,29,35,42,43,44,45,54,55,56,57,71,72,73,74,75],inclusive:!1},FLOATING_NOTE_ID:{rules:[64],inclusive:!1},FLOATING_NOTE:{rules:[61,62,63],inclusive:!1},NOTE_TEXT:{rules:[66,67],inclusive:!1},NOTE_ID:{rules:[65],inclusive:!1},NOTE:{rules:[58,59,60],inclusive:!1},STYLEDEF_STYLEOPTS:{rules:[],inclusive:!1},STYLEDEF_STYLES:{rules:[31],inclusive:!1},STYLE_IDS:{rules:[],inclusive:!1},STYLE:{rules:[30],inclusive:!1},CLASS_STYLE:{rules:[28],inclusive:!1},CLASS:{rules:[27],inclusive:!1},CLASSDEFID:{rules:[25],inclusive:!1},CLASSDEF:{rules:[23,24],inclusive:!1},acc_descr_multiline:{rules:[20,21],inclusive:!1},acc_descr:{rules:[18],inclusive:!1},acc_title:{rules:[16],inclusive:!1},SCALE:{rules:[13,14,33,34],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[48],inclusive:!1},STATE_STRING:{rules:[49,50],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[9,10,36,37,38,39,40,41,46,47,51,52,53],inclusive:!1},ID:{rules:[9,10],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,10,11,12,15,17,19,22,26,29,32,35,53,57,68,69,70,71,72,73,74,76,77,78],inclusive:!0}}};return $}();yt.lexer=pe;function lt(){this.yy={}}return d(lt,"Parser"),lt.prototype=yt,yt.Parser=lt,new lt}();Dt.parser=Dt;var Je=Dt,be="TB",ee="TB",jt="dir",ft="state",vt="relation",Te="classDef",_e="style",Ee="applyClass",q="default",se="divider",ie="fill:none",re="fill: #333",ae="c",ne="text",le="normal",kt="rect",mt="rectWithTitle",ke="stateStart",me="stateEnd",Ht="divider",zt="roundedWithTitle",De="note",ve="noteGroup",Q="statediagram",Ce="state",xe=`${Q}-${Ce}`,oe="transition",Ae="note",Le="note-edge",Ie=`${oe} ${Le}`,Re=`${Q}-${Ae}`,Oe="cluster",Ne=`${Q}-${Oe}`,we="cluster-alt",$e=`${Q}-${we}`,ce="parent",he="note",Pe="state",At="----",Be=`${At}${he}`,Wt=`${At}${ce}`,ue=d((t,e=ee)=>{if(!t.doc)return e;let s=e;for(let n of t.doc)n.stmt==="dir"&&(s=n.value);return s},"getDir"),Ge=d(function(t,e){return e.db.getClasses()},"getClasses"),Ye=d(async function(t,e,s,n){m.info("REF0:"),m.info("Drawing state diagram (v2)",e);let{securityLevel:o,state:p,layout:r}=x();n.db.extract(n.db.getRootDocV2());let u=n.db.getData(),f=Mt(e,o);u.type=n.type,u.layoutAlgorithm=r,u.nodeSpacing=p?.nodeSpacing||50,u.rankSpacing=p?.rankSpacing||50,u.markers=["barb"],u.diagramId=e,await Vt(u,f);let g=8;Ft.insertTitle(f,"statediagramTitleText",p?.titleTopMargin??25,n.db.getDiagramTitle()),Ut(f,g,Q,p?.useMaxWidth??!0)},"draw"),qe={getClasses:Ge,draw:Ye,getDir:ue},pt=new Map,B=0;function St(t="",e=0,s="",n=At){let o=s!==null&&s.length>0?`${n}${s}`:"";return`${Pe}-${t}${o}-${e}`}d(St,"stateDomId");var Fe=d((t,e,s,n,o,p,r,u)=>{m.trace("items",e),e.forEach(f=>{switch(f.stmt){case ft:J(t,f,s,n,o,p,r,u);break;case q:J(t,f,s,n,o,p,r,u);break;case vt:{J(t,f.state1,s,n,o,p,r,u),J(t,f.state2,s,n,o,p,r,u);let g={id:"edge"+B,start:f.state1.id,end:f.state2.id,arrowhead:"normal",arrowTypeEnd:"arrow_barb",style:ie,labelStyle:"",label:P.sanitizeText(f.description,x()),arrowheadStyle:re,labelpos:ae,labelType:ne,thickness:le,classes:oe,look:r};o.push(g),B++}break}})},"setupDoc"),Xt=d((t,e=ee)=>{let s=e;if(t.doc)for(let n of t.doc)n.stmt==="dir"&&(s=n.value);return s},"getDir");function K(t,e,s){if(!e.id||e.id==="</join></fork>"||e.id==="</choice>")return;e.cssClasses&&(Array.isArray(e.cssCompiledStyles)||(e.cssCompiledStyles=[]),e.cssClasses.split(" ").forEach(o=>{if(s.get(o)){let p=s.get(o);e.cssCompiledStyles=[...e.cssCompiledStyles,...p.styles]}}));let n=t.find(o=>o.id===e.id);n?Object.assign(n,e):t.push(e)}d(K,"insertOrUpdateNode");function de(t){return t?.classes?.join(" ")??""}d(de,"getClassesFromDbInfo");function fe(t){return t?.styles??[]}d(fe,"getStylesFromDbInfo");var J=d((t,e,s,n,o,p,r,u)=>{let f=e.id,g=s.get(f),_=de(g),E=fe(g);if(m.info("dataFetcher parsedItem",e,g,E),f!=="root"){let I=kt;e.start===!0?I=ke:e.start===!1&&(I=me),e.type!==q&&(I=e.type),pt.get(f)||pt.set(f,{id:f,shape:I,description:P.sanitizeText(f,x()),cssClasses:`${_} ${xe}`,cssStyles:E});let S=pt.get(f);e.description&&(Array.isArray(S.description)?(S.shape=mt,S.description.push(e.description)):S.description?.length>0?(S.shape=mt,S.description===f?S.description=[e.description]:S.description=[S.description,e.description]):(S.shape=kt,S.description=e.description),S.description=P.sanitizeTextOrArray(S.description,x())),S.description?.length===1&&S.shape===mt&&(S.type==="group"?S.shape=zt:S.shape=kt),!S.type&&e.doc&&(m.info("Setting cluster for XCX",f,Xt(e)),S.type="group",S.isGroup=!0,S.dir=Xt(e),S.shape=e.type===se?Ht:zt,S.cssClasses=`${S.cssClasses} ${Ne} ${p?$e:""}`);let L={labelStyle:"",shape:S.shape,label:S.description,cssClasses:S.cssClasses,cssCompiledStyles:[],cssStyles:S.cssStyles,id:f,dir:S.dir,domId:St(f,B),type:S.type,isGroup:S.type==="group",padding:8,rx:10,ry:10,look:r};if(L.shape===Ht&&(L.label=""),t&&t.id!=="root"&&(m.trace("Setting node ",f," to be child of its parent ",t.id),L.parentId=t.id),L.centerLabel=!0,e.note){let R={labelStyle:"",shape:De,label:e.note.text,cssClasses:Re,cssStyles:[],cssCompilesStyles:[],id:f+Be+"-"+B,domId:St(f,B,he),type:S.type,isGroup:S.type==="group",padding:x().flowchart.padding,look:r,position:e.note.position},G=f+Wt,Y={labelStyle:"",shape:ve,label:e.note.text,cssClasses:S.cssClasses,cssStyles:[],id:f+Wt,domId:St(f,B,ce),type:"group",isGroup:!0,padding:16,look:r,position:e.note.position};B++,Y.id=G,R.parentId=G,K(n,Y,u),K(n,R,u),K(n,L,u);let N=f,w=R.id;e.note.position==="left of"&&(N=R.id,w=f),o.push({id:N+"-"+w,start:N,end:w,arrowhead:"none",arrowTypeEnd:"",style:ie,labelStyle:"",classes:Ie,arrowheadStyle:re,labelpos:ae,labelType:ne,thickness:le,look:r})}else K(n,L,u)}e.doc&&(m.trace("Adding nodes children "),Fe(e,e.doc,s,n,o,!p,r,u))},"dataFetcher"),Ve=d(()=>{pt.clear(),B=0},"reset"),Ct="[*]",Kt="start",Jt=Ct,qt="end",Qt="color",Zt="fill",Me="bgFill",Ue=",";function xt(){return new Map}d(xt,"newClassesList");var te=d(()=>({relations:[],states:new Map,documents:{}}),"newDoc"),dt=d(t=>JSON.parse(JSON.stringify(t)),"clone"),U,Qe=(U=class{constructor(e){D(this,"version");D(this,"nodes",[]);D(this,"edges",[]);D(this,"rootDoc",[]);D(this,"classes",xt());D(this,"documents",{root:te()});D(this,"currentDocument",this.documents.root);D(this,"startEndCount",0);D(this,"dividerCnt",0);D(this,"getAccTitle",wt);D(this,"setAccTitle",Nt);D(this,"getAccDescription",Pt);D(this,"setAccDescription",$t);D(this,"setDiagramTitle",Bt);D(this,"getDiagramTitle",Gt);this.clear(),this.version=e,this.setRootDoc=this.setRootDoc.bind(this),this.getDividerId=this.getDividerId.bind(this),this.setDirection=this.setDirection.bind(this),this.trimColon=this.trimColon.bind(this)}setRootDoc(e){m.info("Setting root doc",e),this.rootDoc=e,this.version===1?this.extract(e):this.extract(this.getRootDocV2())}getRootDoc(){return this.rootDoc}docTranslator(e,s,n){if(s.stmt===vt)this.docTranslator(e,s.state1,!0),this.docTranslator(e,s.state2,!1);else if(s.stmt===ft&&(s.id==="[*]"?(s.id=n?e.id+"_start":e.id+"_end",s.start=n):s.id=s.id.trim()),s.doc){let o=[],p=[],r;for(r=0;r<s.doc.length;r++)if(s.doc[r].type===se){let u=dt(s.doc[r]);u.doc=dt(p),o.push(u),p=[]}else p.push(s.doc[r]);if(o.length>0&&p.length>0){let u={stmt:ft,id:Yt(),type:"divider",doc:dt(p)};o.push(dt(u)),s.doc=o}s.doc.forEach(u=>this.docTranslator(s,u,!0))}}getRootDocV2(){return this.docTranslator({id:"root"},{id:"root",doc:this.rootDoc},!0),{id:"root",doc:this.rootDoc}}extract(e){let s;e.doc?s=e.doc:s=e,m.info(s),this.clear(!0),m.info("Extract initial document:",s),s.forEach(r=>{switch(m.warn("Statement",r.stmt),r.stmt){case ft:this.addState(r.id.trim(),r.type,r.doc,r.description,r.note,r.classes,r.styles,r.textStyles);break;case vt:this.addRelation(r.state1,r.state2,r.description);break;case Te:this.addStyleClass(r.id.trim(),r.classes);break;case _e:{let u=r.id.trim().split(","),f=r.styleClass.split(",");u.forEach(g=>{let _=this.getState(g);if(_===void 0){let E=g.trim();this.addState(E),_=this.getState(E)}_.styles=f.map(E=>E.replace(/;/g,"")?.trim())})}break;case Ee:this.setCssClass(r.id.trim(),r.styleClass);break}});let n=this.getStates(),p=x().look;Ve(),J(void 0,this.getRootDocV2(),n,this.nodes,this.edges,!0,p,this.classes),this.nodes.forEach(r=>{if(Array.isArray(r.label)){if(r.description=r.label.slice(1),r.isGroup&&r.description.length>0)throw new Error("Group nodes can only have label. Remove the additional description for node ["+r.id+"]");r.label=r.label[0]}})}addState(e,s=q,n=null,o=null,p=null,r=null,u=null,f=null){let g=e?.trim();if(this.currentDocument.states.has(g)?(this.currentDocument.states.get(g).doc||(this.currentDocument.states.get(g).doc=n),this.currentDocument.states.get(g).type||(this.currentDocument.states.get(g).type=s)):(m.info("Adding state ",g,o),this.currentDocument.states.set(g,{id:g,descriptions:[],type:s,doc:n,note:p,classes:[],styles:[],textStyles:[]})),o&&(m.info("Setting state description",g,o),typeof o=="string"&&this.addDescription(g,o.trim()),typeof o=="object"&&o.forEach(_=>this.addDescription(g,_.trim()))),p){let _=this.currentDocument.states.get(g);_.note=p,_.note.text=P.sanitizeText(_.note.text,x())}r&&(m.info("Setting state classes",g,r),(typeof r=="string"?[r]:r).forEach(E=>this.setCssClass(g,E.trim()))),u&&(m.info("Setting state styles",g,u),(typeof u=="string"?[u]:u).forEach(E=>this.setStyle(g,E.trim()))),f&&(m.info("Setting state styles",g,u),(typeof f=="string"?[f]:f).forEach(E=>this.setTextStyle(g,E.trim())))}clear(e){this.nodes=[],this.edges=[],this.documents={root:te()},this.currentDocument=this.documents.root,this.startEndCount=0,this.classes=xt(),e||Ot()}getState(e){return this.currentDocument.states.get(e)}getStates(){return this.currentDocument.states}logDocuments(){m.info("Documents = ",this.documents)}getRelations(){return this.currentDocument.relations}startIdIfNeeded(e=""){let s=e;return e===Ct&&(this.startEndCount++,s=`${Kt}${this.startEndCount}`),s}startTypeIfNeeded(e="",s=q){return e===Ct?Kt:s}endIdIfNeeded(e=""){let s=e;return e===Jt&&(this.startEndCount++,s=`${qt}${this.startEndCount}`),s}endTypeIfNeeded(e="",s=q){return e===Jt?qt:s}addRelationObjs(e,s,n){let o=this.startIdIfNeeded(e.id.trim()),p=this.startTypeIfNeeded(e.id.trim(),e.type),r=this.startIdIfNeeded(s.id.trim()),u=this.startTypeIfNeeded(s.id.trim(),s.type);this.addState(o,p,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),this.addState(r,u,s.doc,s.description,s.note,s.classes,s.styles,s.textStyles),this.currentDocument.relations.push({id1:o,id2:r,relationTitle:P.sanitizeText(n,x())})}addRelation(e,s,n){if(typeof e=="object")this.addRelationObjs(e,s,n);else{let o=this.startIdIfNeeded(e.trim()),p=this.startTypeIfNeeded(e),r=this.endIdIfNeeded(s.trim()),u=this.endTypeIfNeeded(s);this.addState(o,p),this.addState(r,u),this.currentDocument.relations.push({id1:o,id2:r,title:P.sanitizeText(n,x())})}}addDescription(e,s){let n=this.currentDocument.states.get(e),o=s.startsWith(":")?s.replace(":","").trim():s;n.descriptions.push(P.sanitizeText(o,x()))}cleanupLabel(e){return e.substring(0,1)===":"?e.substr(2).trim():e.trim()}getDividerId(){return this.dividerCnt++,"divider-id-"+this.dividerCnt}addStyleClass(e,s=""){this.classes.has(e)||this.classes.set(e,{id:e,styles:[],textStyles:[]});let n=this.classes.get(e);s?.split(Ue).forEach(o=>{let p=o.replace(/([^;]*);/,"$1").trim();if(RegExp(Qt).exec(o)){let u=p.replace(Zt,Me).replace(Qt,Zt);n.textStyles.push(u)}n.styles.push(p)})}getClasses(){return this.classes}setCssClass(e,s){e.split(",").forEach(n=>{let o=this.getState(n);if(o===void 0){let p=n.trim();this.addState(p),o=this.getState(p)}o.classes.push(s)})}setStyle(e,s){let n=this.getState(e);n!==void 0&&n.styles.push(s)}setTextStyle(e,s){let n=this.getState(e);n!==void 0&&n.textStyles.push(s)}getDirectionStatement(){return this.rootDoc.find(e=>e.stmt===jt)}getDirection(){return this.getDirectionStatement()?.value??be}setDirection(e){let s=this.getDirectionStatement();s?s.value=e:this.rootDoc.unshift({stmt:jt,value:e})}trimColon(e){return e&&e[0]===":"?e.substr(1).trim():e.trim()}getData(){let e=x();return{nodes:this.nodes,edges:this.edges,other:{},config:e,direction:ue(this.getRootDocV2())}}getConfig(){return x().state}},d(U,"StateDB"),D(U,"relationType",{AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3}),U),je=d(t=>`
defs #statediagram-barbEnd {
    fill: ${t.transitionColor};
    stroke: ${t.transitionColor};
  }
g.stateGroup text {
  fill: ${t.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${t.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${t.stateLabelColor};
}

g.stateGroup rect {
  fill: ${t.mainBkg};
  stroke: ${t.nodeBorder};
}

g.stateGroup line {
  stroke: ${t.lineColor};
  stroke-width: 1;
}

.transition {
  stroke: ${t.transitionColor};
  stroke-width: 1;
  fill: none;
}

.stateGroup .composit {
  fill: ${t.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${t.noteBorderColor};
  fill: ${t.noteBkgColor};

  text {
    fill: ${t.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${t.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${t.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel {
  background-color: ${t.edgeLabelBackground};
  p {
    background-color: ${t.edgeLabelBackground};
  }
  rect {
    opacity: 0.5;
    background-color: ${t.edgeLabelBackground};
    fill: ${t.edgeLabelBackground};
  }
  text-align: center;
}
.edgeLabel .label text {
  fill: ${t.transitionLabelColor||t.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${t.transitionLabelColor||t.tertiaryTextColor};
}

.stateLabel text {
  fill: ${t.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node .fork-join {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node circle.state-end {
  fill: ${t.innerEndBackground};
  stroke: ${t.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${t.compositeBackground||t.background};
  // stroke: ${t.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${t.stateBkg||t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: 1px;
}
.node polygon {
  fill: ${t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};;
  stroke-width: 1px;
}
#statediagram-barbEnd {
  fill: ${t.lineColor};
}

.statediagram-cluster rect {
  fill: ${t.compositeTitleBackground};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: 1px;
}

.cluster-label, .nodeLabel {
  color: ${t.stateLabelColor};
  // line-height: 1;
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${t.stateBorder||t.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${t.compositeBackground||t.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${t.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${t.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${t.noteTextColor};
}

#dependencyStart, #dependencyEnd {
  fill: ${t.lineColor};
  stroke: ${t.lineColor};
  stroke-width: 1;
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${t.textColor};
}
`,"getStyles"),Ze=je;export{Je as a,qe as b,Qe as c,Ze as d};
