ace.define("ace/snippets/abc",["require","exports","module"],function(e,t,n){"use strict";t.snippetText='\n\n\nsnippet zupfnoter.note\n			,{"pos": [30,30], "text": "note at 10,30", "style": "regular"}\n\nsnippet zupfnoter.smallextract\n	   ,\n	   "${1:extractnr}": {\n			   "voices": [1,2,3,4],\n			   "flowlines": [1,3],\n			   "synchlines": [[1,2], [3,4]]\n			 }\n		 }\n\nsnippet zupfnoter.extract\n	   ,\n	  "${1:extractnr}": {\n		  "title": "${2:extract_title}",\n		  "startpos": 15,\n		  "voices": [1, 2, 3, 4],\n		  "synchlines": [[1, 2], [3, 4]],\n		  "flowlines": [1, 3],\n		  "subflowlines": [2, 4],\n		  "jumplines": [1, 3],\n		  "layoutlines": [1, 2, 3, 4],\n		  "legend": {"pos": [320, 20]},\n		   "lyrics": {"pos": [320, 50]},\n			"notes":[\n					 {"pos": [320,5], "text": "${3:sheet_title}", "style": "large"}\n			]\n		  }\n\nsnippet zupfnoter.config\n	%%%%zupfnoter.config\n	{\n	 "produce":[1,2],\n	 "extract": {\n	   "0": {\n			   "voices": [1,2,3,4],\n			   "flowlines": [1,3],\n			   "synchlines": [[1,2], [3,4]],\n			   "layoutlines": [1,2,3,4],\n			   "lyrics": {"versepos": {"1,2,3,4,5,6" :[10,100]}},\n			   "legend": {"pos": [330,20]},\n			   "notes":[\n						{"pos": [320,5], "text": "${1:sheet_title}", "style": "large"}\n			   ]\n			 }\n		 }\n	 }\n\nsnippet zupfnoter.target\n	"^:${1:target}"\n\nsnippet zupfnoter.goto\n	"^@${1:target}@${2:distance}"\n\nsnippet zupfnoter.annotationref\n	"^#${1:target}"\n\nsnippet zupfnoter.annotation\n	"^!${1:text}@${2:x_offset},${3:y_offset}"\n\n\n',t.scope="abc"})