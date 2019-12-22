window.MathJax = {};
class Walrus {
	constructor()
	{
		this.config = {};
		this.Wrap = null;
		this.mathEnabled = false;
		this.current = null;
	}


	/**
	 * 
	 * @param {String} key - The property name
	 * @param {*} defa - The default value
	 * @param {Object} obj - The object
	 * @returns If obj[key] is defined, returns obj[key]. Otherwise, returns defa.
	 */
	static getProp(key, defa, obj)
	{
		if(Object.prototype.hasOwnProperty.call(obj, key))
		{
			return obj[key];
		}
		return defa;
	}


	/**
	 * 
	 * @param {String} s - A string
	 * @returns The string as a URI Encoded component
	 */
	static URIEncode(s)
	{
		return encodeURIComponent(s.replace(/ /g, "-"));
	}


	/**
	 * 
	 * @param {String} s - A URI Encoded String
	 * @returns A decoded String
	 */
	static URIDecode(s)
	{
		return decodeURIComponent(s).replace(/-/g, " ");
	}

	static createHTMLElement(tg, options={})
	{
		let el = document.createElement(tg);
		if(typeof options == "string")
		{
			el.appendChild(document.createTextNode(options));
			return el;
		}
		let attr = Walrus.getProp("attr",{},options);
		let props = Walrus.getProp("props",{},options);
		let listen = Walrus.getProp("listen",{},options);
		let children = Walrus.getProp("children",[],options);
		let classes = Walrus.getProp("classes",[],options);
		for(let a in attr)
		{
			el.setAttribute(attr, attr[a]);
		}
		for(let p in props)
		{
			el[p] = props[p];
		}
		for(let l in listen)
		{
			el.addEventListener(l, listen[l]);
		}
		for(let i = 0; i < children.length; i++)
		{
			el.appendChild(children[i]);
		}
		for(let c = 0; c < classes.length; c++)
		{
			el.classList.add(classes[c]);
		}
		return el;
	}


	/**
	 * @param {Object} conf - The config
	 * @description Adds all missing values to the config
	 * @returns The new config
	 */
	static formatConfig(conf)
	{
		let newConfig = {
			Title: conf.Title,
			Directory: Walrus.getProp("Directory", ".", conf),
			Math: Walrus.getProp("Math", false, conf),
			Direction:Walrus.getProp("Direction", "LTR", conf),
			BaseURL:conf.BaseURL,
			DefaultMode:Walrus.getProp("DefaultMode","dark",conf).toLowerCase(),
			Protocol:Walrus.getProp("Protocol","http",conf).toLowerCase(),
			Reload:Walrus.getProp("Reload", false, conf),
			Subjects:[],
			MathJaxConfig:Walrus.getProp("MathJaxConfig",{
				tex: {
					inlineMath: [["$", "$"], ["\\(", "\\)"]],
					tags: "ams"
				}
			}, conf)
		};
		for(let i = 0; i < conf.Subjects.length; i++)
		{
			let subjNow = conf.Subjects[i];
			let subj = {
				Title: subjNow.Title,
				Slug: Walrus.URIEncode(Walrus.getProp("Slug", subjNow.Title, subjNow)),
				Directory: newConfig.Directory+"/"+Walrus.getProp("Directory", subjNow.Title, subjNow),
				Math: Walrus.getProp("Math", newConfig.Math, subjNow),
				Direction: Walrus.getProp("Direction", newConfig.Direction, subjNow),
				Articles:[]
			};

			for(let j = 0; j < subjNow.Articles.length; j++)
			{
				let artNow = subjNow.Articles[j];
				let artic = {
					Title: artNow.Title,
					Slug: Walrus.URIEncode(Walrus.getProp("Slug", artNow.Title, artNow)),
					File: subj.Directory+"/"+Walrus.getProp("File", artNow.Title+".tex", artNow),
					Direction: Walrus.getProp("Direction", subj.Direction, artNow),
					Math: Walrus.getProp("Math", subj.Math, artNow)
				};
				subj.Articles.push(artic);
			}

			newConfig.Subjects.push(subj);

		}
		return newConfig;
	}


	/**
	 * 
	 * @param {String} s - A URL String
	 * @returns an object of the form {Subject, Article, Section}
	 */
	parseURL(s)
	{
		let obj = {
			Section:"",
			Article:"",
			Subject:""
		};
		let section = s.match(/.+?(?=#)#(.*)/);
		if(section != null){
			obj.Section = section[1];
		}
		let p = s.replace(/https?:\/\//, "");
		p = p.replace("#"+obj.Section,"").substring(this.config.BaseURL.length).split("/").filter(w=>w.length>0);
		if(p.length == 0)
		{
			return null;
		}
		else if(p.length >= 1)
		{
			obj.Subject = p[0];
			if(p.length > 1)
			{
				obj.Article = p[1];
			}
		}
		return obj;
	}


	/**
	 * 
	 * @param {String} t - Article text
	 * @description Generates sections and subsections HTML
	 * @returns An array containing the HTML result and the sections array
	 */
	static handleText(t)
	{
		let subsections = [];
		return [t.replace(/^\#(.*)$/gm, (full,name)=>{
			let level = 1;
			let subsection = name;
			for(let i = 0; i < name.length; i++)
			{
				if(name[i] == "#")
				{
					level++;
					subsection = subsection.substr(1);
				}
				else
				{
					break;
				}
			}
			subsection = subsection.trim();
			subsections.push({
				title:subsection,
				level
			});
			return "<a name=\""+
					encodeURIComponent(
						subsection
							.replace(/ /g, "-")
							.replace(/\?/g,"")
					)+
					"\"><h"
					+level+
					">"+
					subsection+
					"</h"+level+"></a>";
		}),subsections];
	}


	/**
	 * 
	 * @param {String} s - Section name
	 * @description Moves to a given section
	 */
	static moveToSection(s)
	{
		try{
			document.getElementsByName(s)[0].scrollIntoView();
		}catch(err){
			console.log(err);
		}
	}

	hasPathChanged(url1, url2)
	{
		let p1 = this.parseURL(url1);
		let p2 = this.parseURL(url2);
		if(p1 == null && p2 == null)
		{
			return false;
		}
		if(p1 == null || p2 == null)
		{
			return true;
		}
		return p1.Subject != p2.Subject || p1.Article != p2.Article;
	}

	/**
	 * 
	 * @param {String} p - The Path
	 * @param {String} t - The title, "" by default
	 * @param {Object} st - The state, {} by default
	 */
	changeURL(p, t="", st={})
	{
		try
		{
			let des = this.getPageURL(p);
			if(this.hasPathChanged(des, window.location.href))
			{
				window.history.pushState(st, t, des);
			}
		}
		catch(e)
		{
			console.log(e);
		}
	}



	start(c)
	{
		if(typeof c == "string")
		{
			this.loadConfigFromFile(c).then(()=>this.setup());
		}
		else
		{
			this.loadConfig(c);
			this.setup();
		}
	}

	/**
	 * @description Sets up all the HTML elements required
	 */
	setup()
	{

		this.Wrap = Walrus.createHTMLElement(
			"span",
			{
				props:{
					id:"Walrus"
				},
				children:[
					Walrus.createHTMLElement(
						"div",
						{
							props:{
								id:"menu"
							},
							children:[
								Walrus.createHTMLElement("h1",{props:{id:"site_title",innerText:this.config.Title}}),
								Walrus.createHTMLElement("h3",{
									children:[
										Walrus.createHTMLElement("span",{props:{id:"light",innerText:"Light"}}),
										document.createTextNode(" | "),
										Walrus.createHTMLElement("span",{props:{id:"dark",innerText:"Dark"}})
									]
								})
							]
						}
					),
					Walrus.createHTMLElement(
						"div",
						{
							props:{
								id:"reader"
							},
							children:[
								Walrus.createHTMLElement("h1",{props:{id:"title"}}),
								Walrus.createHTMLElement("div",{props:{id:"article"}})
							]
						}
					)
				]
			}
		);
		document.body.appendChild(this.Wrap);
		this.setDirection(this.config.Direction);
		if(localStorage.getItem("display_mode") == null)
		{
			localStorage.setItem("display_mode", this.config.DefaultMode);
		}
		this.setMode(localStorage.getItem("display_mode"));
		document.getElementById("light").addEventListener("click",()=>this.setMode("light"));
		document.getElementById("dark").addEventListener("click",()=>this.setMode("dark"));

		document.getElementById("site_title").addEventListener("click",()=>{
			if(this.config.Reload)
			{
				window.location.href = this.getPageURL("");
			}
			else
			{
				this.loadIndex();
			}
		});

		this.generateMenu();
		this.handleURL();

		window.addEventListener("popstate",()=>{
			this.handleURL();
		});
		
	}

	/**
	 * @description Loads article or subject by current URL
	 */
	handleURL()
	{
		let what = this.parseURL(window.location.href);
		let prev = this.current;
		this.current = what;
		if(what == null)
		{
			this.loadIndex();
		}
		else if(prev != null && what.Subject == prev.Subject && what.Article == prev.Article)
		{
			return;
		}
		else if(what.Article.length>0)
		{
			let artic = this.getArticleBySubjectAndSlug(what.Subject,what.Article);
			if(Object.prototype.hasOwnProperty.call(artic,"errorCode"))
			{
				this.trigger404();
			}
			else
			{
				this.loadArticle(artic, what.Subject).then(()=>{
					if(what.Section.length > 0)
					{
						Walrus.moveToSection(what.Section);
					}
				});
			}
		}
		else
		{
			let subj = this.getSubjectBySlug(what.Subject);
			if(Object.prototype.hasOwnProperty.call.hasOwnProperty(subj,"errorCode"))
			{
				this.trigger404();
			}
			else
			{
				this.loadSubject(subj);
			}
		}
	}


	/**
	 * @param {String} m, "light" or "dark"
	 * @description Sets mode to light or dark 
	 */
	setMode(m)
	{
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add(m.toLowerCase());
		localStorage.setItem("display_mode", m);
	}


	/**
	 * 
	 * @param {Object} conf - A config object
	 * @description Adds all default values for f and loads it
	 */
	loadConfig(conf)
	{
		this.config = Walrus.formatConfig(conf);
	}


	/**
	 * 
	 * @param {String} f - The file name
	 * @description Sends an HTTP Request to f and loads its contents as a config
	 */
	loadConfigFromFile(f)
	{
		return new Promise((resolve)=>{
			fetch(f)
				.then(resp => resp.json())
				.then(jsonData => this.loadConfig(jsonData))
				.then(()=>resolve());
		});
	}


	/**
	 * 
	 * @param {String} s - A Slug
	 * @description Finds a subject with the given slug
	 * @returns The subject object. If a subject with the given slug doesn't exist, returns {errorCode:404};
	 */
	getSubjectBySlug(s)
	{
		for(let i = 0; i < this.config.Subjects.length; i++)
		{
			if(this.config.Subjects[i].Slug.toLowerCase() == s.toLowerCase())
			{
				return this.config.Subjects[i];
			}
		}
		return {errorCode:404};
	}


	/**
	 * 
	 * @param {String} sbj - A subject slug
	 * @param {String} slg - An article slug
	 * @description Finds an article with the given slug in the subject with the given subject slug
	 * @returns The article object. If an article with the given slug in the subject with the given subject slug doesn't exist, returns {errorCode:404};
	 */
	getArticleBySubjectAndSlug(sbj, slg)
	{
		let artics = this.getSubjectBySlug(sbj);
		if(!Object.prototype.hasOwnProperty.call.hasOwnProperty(artics,"errorCode"))
		{
			artics = artics.Articles;
			for(let i = 0; i < artics.length; i++)
			{
				if(artics[i].Slug.toLowerCase() == slg.toLowerCase())
				{
					return artics[i];
				}
			}
		}
		return {errorCode:404};
	}


	/**
	 * 
	 * @param {String} txt - Article text
	 * @description Sets the text of the article in view to txt
	 */
	setArticleContents(txt)
	{
		if(typeof txt == "string")
		{
			document.getElementById("article").innerHTML = txt;
		}
		else
		{
			document.getElementById("article").innerHTML = "";
			for(let i = 0; i < arguments.length; i++)
			{
				document.getElementById("article").appendChild(arguments[i]);
			}
		}
	}


	/**
	 * 
	 * @param {String} txt - Article title
	 * @description Sets the title of the article in view
	 */
	setArticleTitle(txt)
	{
		document.title = (txt.length>0?(txt + " :: "):"") + this.config.Title;
		document.getElementById("title").innerText = txt;
	}


	/**
	 * 
	 * @param {String} drc - Either LTR or RTL
	 * @description Sets the page direction
	 */
	setDirection(drc)
	{
		this.Wrap.classList.remove("LTR");
		this.Wrap.classList.remove("RTL");
		this.Wrap.classList.add(drc.toUpperCase());
	}


	/**
	 * @description Adds the MathJax script
	 */
	loadMathJAX()
	{
		if(!this.mathEnabled)
		{
			window.MathJax = this.config.MathJaxConfig;
			var script = document.createElement("script");
			script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
			script.async = true;
			document.head.appendChild(script);
			this.mathEnabled = true;
		}
		else
		{
			try{
				MathJax.typeset();
			}
			catch(e)
			{
				console.log(e);
			}
		}
	}


	/**
	 * 
	 * @param {Array[Object]} ss - sections array
	 * @returns A Table of contents div HTML element
	 */
	toTableOfContents(ss)
	{
		let toc = document.createElement("div");
		toc.id = "toc";
		let numbering = 0;
		let workingOn = 0;
		while(workingOn < ss.length)
		{
			if(ss[workingOn].level <= 2)
			{
				numbering++;
				toc.appendChild(this.createTOCItem(ss[workingOn].title,numbering,"#"+ss[workingOn].title.replace(/ /g,"-").replace(/\?/g,"")));
				workingOn++;
			}
			else if(ss[workingOn].level >= 3)
			{
				let sm = this.generateSubTOC(ss ,workingOn, numbering);
				toc.appendChild(sm[0]);
				workingOn = sm[1];
			}
		}
		return toc;
	}


	/**
	 * 
	 * @param {Array[Object]} ss - sections array
	 * @param {Integer} start - The current item index
	 * @param {Integer} num - The current section index
	 * @returns An array containing a div HTML element with the sub-table of contents and the current index
	 */
	generateSubTOC(ss, start, num)
	{
		let startingLevel = ss[start].level;
		let insideNumbering = 0;
		let subTOC = document.createElement("span");
		subTOC.classList.add("subsection");
		let currentIndex = start;
		while(currentIndex < ss.length && ss[currentIndex].level >= startingLevel)
		{
			if(ss[currentIndex].level == startingLevel)
			{
				insideNumbering++;
				subTOC.appendChild(this.createTOCItem(ss[currentIndex].title, num + "." + insideNumbering, "#"+ss[currentIndex].title.replace(/ /g,"-").replace(/\?/g,"")));
				currentIndex++;
			}
			else
			{
				let sub2toc = this.generateSubTOC(ss, currentIndex, num + "." + insideNumbering);
				subTOC.appendChild(sub2toc[0]);
				currentIndex = sub2toc[1];
			}
		}
		return [subTOC, currentIndex];
	}


	/**
	 * 
	 * @param {String} t - Section title
	 * @param {Number} n - Section index
	 * @param {String} h - HREF
	 * @returns HTML element for the Table of contents.
	 */
	createTOCItem(t,n,h)
	{
		return Walrus.createHTMLElement("span",{
			classes:["item"],
			children:[
				Walrus.createHTMLElement("span",
					{
						classes:["num"],
						children:[document.createTextNode(n)]
					}),
				Walrus.createHTMLElement("a",{
					props:{
						href:h
					},
					children:[document.createTextNode(t)]
				})
			]
		});
	}


	/**
	 * @description Generates the side menu
	 */
	generateMenu()
	{
		let list = document.createElement("ol");
		for(let i = 0; i < this.config.Subjects.length; i++)
		{
			let el = document.createElement("li");
			let link = document.createElement("a");
			if(this.config.Reload)
			{
				link.href = this.getPageURL(this.config.Subjects[i].Slug);
			}
			else
			{
				link.href="javascript:void(0)";
				link.addEventListener("click",()=>{
					this.loadSubject(this.getSubjectBySlug(this.config.Subjects[i].Slug));
				});
			}
			link.innerText = this.config.Subjects[i].Title;
			el.appendChild(link);
			list.appendChild(el);
		}
		document.getElementById("menu").appendChild(list);
	}


	/**
	 * 
	 * @param {String} p - The path
	 * @returns A full URL for the path
	 */
	getPageURL(p)
	{
		return this.config.Protocol+"://"+this.config.BaseURL+"/"+p;
	}


	/**
	 * @description Sets the article title to "404 Not Found"
	 */
	trigger404()
	{
		this.setArticleTitle("404 Not Found");
		this.setDirection(this.config.Direction);
	}


	/**
	 * 
	 * @param {Object} a - Article object
	 * @param {String} s - The Subject slug
	 * @description Loads article onto view
	 */
	loadArticle(a, s)
	{
		return new Promise((resolve)=>{
			this.setArticleTitle(a.Title);
			this.setArticleContents("");
			this.changeURL(s + "/" + a.Slug, a.Title);
			this.setDirection(a.Direction);
			fetch(this.getPageURL(a.File))
				.then(resp => resp.text())
				.then(resp=>{
					let afterText = Walrus.handleText(resp, a.Title);
					this.setArticleContents(
						this.toTableOfContents(afterText[1]).outerHTML+afterText[0]
					);
					if(a.Math)
					{
						this.loadMathJAX();
					}
					resolve();
				});
		});
	}


	/**
	 * @param {Object} s - Subject Object
	 * @param {boolean} addTitle - Whether or not to add title
	 * @returns An HTML element with the subject menu
	 */
	createSubjectMenu(s, addTitle = true)
	{
		let menu = document.createElement("div");
		menu.classList.add("sm");
		if(addTitle)
		{
			let tel = document.createElement("span");
			tel.classList.add("subj_title");
			tel.innerText = s.Title;
			menu.appendChild(tel);
		}
		for(let i = 0; i < s.Articles.length; i++)
		{
			let hf = this.getPageURL(s.Slug + "/" + s.Articles[i].Slug);
			if(!this.config.Reload)
			{
				hf = "javascript:void(0)";
			}
			let el = this.createTOCItem(s.Articles[i].Title, i + 1, hf);
			if(!this.config.Reload)
			{
				el.getElementsByTagName("a")[0].addEventListener("click",()=>{
					this.loadArticle(this.getArticleBySubjectAndSlug(s.Slug, s.Articles[i].Slug),s.Slug);
				});
			}
			menu.appendChild(el);
		}
		return menu;
	}


	/**
	 * 
	 * @param {Object} s - Subject Object
	 * @description Loads a subject page
	 */
	loadSubject(s)
	{
		this.setArticleTitle(s.Title);
		this.changeURL(s.Slug, s.Title);
		this.setDirection(s.Direction);
		this.setArticleContents(this.createSubjectMenu(s, false));
	}


	/**
	 * @description Loads the index page
	 */
	loadIndex()
	{
		this.setArticleTitle("");
		this.changeURL("", this.config.Title);
		this.setDirection(this.config.Direction);
		let lists = document.createElement("div");
		for(let i = 0; i < this.config.Subjects.length; i++)
		{
			lists.appendChild(this.createSubjectMenu(this.config.Subjects[i]));
		}
		this.setArticleContents(lists);
	}
}
