$(function() {
    var payload;
    var defaultLayout = {
        rows: ["Covenant", "Soulbind"],
        cols: ["Legendary"],
        rowOrder: "value_z_to_a",
        colOrder: "value_z_to_a",
        rendererName: "Heatmap",
        inclusions: {},
        exclusions: {}
    }

    let rend = $.pivotUtilities.renderers;
    let plot = $.pivotUtilities.plotly_renderers;
    delete rend["Table Barchart"];
    rend["Vertical Bar"] = plot["Bar Chart"];
    rend["Horizontal Bar"] = plot["Horizontal Bar Chart"];
    rend["Line Chart"] = plot["Line Chart"];
    rend["Area Chart"] = plot["Area Chart"];

    var talentCode = {
        '15': { '1': "NB",   '2': "WOE", '3': "FON" },
        '40': { '1': "SOTF", '2': "SL",  '3': "INC" },
        '45': { '1': "SD",   '2': "TM",  '3': "SF"  },
        '50': { '1': "SOL",  '2': "FOE", '3': "NM"  }
    }
    function getTalentNum(tier, tal) {
        let o = talentCode[tier];
        return Object.keys(o).find(key => o[key] === tal);
    }
    function getT15(r) { return talentCode['15'][r.tal.charAt(0)]; }
    function getT40(r) { return talentCode['40'][r.tal.charAt(4)]; }
    function getT45(r) { return talentCode['45'][r.tal.charAt(5)]; }
    function getT50(r) { return talentCode['50'][r.tal.charAt(6)]; }

    function toCap(s) { return s.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase()))); }

    var defaultOptions = {
        renderers: rend,
        hiddenFromDragDrop: ["dps", "cov", "soul", "cond1", "cond2", "leg", "tal"],
        hiddenFromAggregators: ["cov", "soul", "cond1", "cond2", "leg", "tal"],
        aggregators: {
            "DPS": function() { return $.pivotUtilities.aggregatorTemplates.max()(["dps"]) }
        },
        vals: ["dps"],
        rendererOptions: {
            heatmap: {
                colorScaleGenerator: function(val) {
                    let min = Math.min(...val);
                    let max = Math.max(...val);
                    return Plotly.d3.scale.linear()
                        .domain([min, max])
                        .range(["#FFFFFF", "#FF7D0A"])
                }
            },
            table: {
                mouseenterCallback: function(e, value, filters, pivotData) {
                    let $tar = $(e.target);
                    if ($tar.hasClass("pvtVal")) {
                        let buf = [];
                        pivotData.forEachMatchingRecord(filters, function(r) { buf.push(r); });
                        buf.sort(function(a, b) { return b.dps - a.dps; });
                        let str = "<table class=\"tip\">";
                        str += "<tr><td class=\"tip-right\">Covenant:</td><td>" + buf[0].Covenant + "</td></tr>";
                        str += "<tr><td class=\"tip-right\">Soulbind:</td><td>" + buf[0].Soulbind + "</td></tr>";
                        str += "<tr><td class=\"tip-right\">Talents:</td><td>" + buf[0].Talents + "</td></tr>";
                        str += "<tr><td class=\"tip-right\">Conduit1:</td><td>" + buf[0].Conduit1 + "</td></tr>";
                        str += "<tr><td class=\"tip-right\">Conduit2:</td><td>" + buf[0].Conduit2 + "</td></tr>";
                        str += "<tr><td class=\"tip-right\">Legendary:</td><td>" + buf[0].Legendary + "</td></tr>";
                        str += "<tr class=\"tip-dps\"><td class=\"tip-right\">DPS:</td><td>" + buf[0].dps.toFixed(2) + "</td></tr>";
                        str += "</table>"
                        $(".ui-tooltip-content").html(str);
                    }
                }
            }
        },
        onRefresh: function(c) {
            if ($("#pivot").tooltip("instance")) {
                $("#pivot").tooltip("destroy");
            }
            $("#pivot").tooltip({
                items: ".pvtVal",
                position: {
                    my: "left center-60",
                    at: "right+7 center",
                    collision: "none"
                },
                content: "Something went wrong... Please submit a bug."
            });

            (async () => {
                let file = $("#fightstyle").val();
                const commit = await fetch('https://api.github.com/repos/balance-simc/Balance-SimC/commits?path=' + file);
                const d_json = await commit.json();
                let date = new Date(d_json[0]['commit']['committer']['date']);
                $("#update").html(date.toLocaleString());
            })()
        },
        derivedAttributes: {
            'Covenant': r => { 
                let c = r.cov;
                if (c == "night_fae") { c = "Night Fae"; }
                return c;
            },
            'Soulbind':  r => { return toCap(r.soul); },
            'Legendary': r => { return toCap(r.leg); },
            'Conduit1':  r => { return toCap(r.cond1.replaceAll('_', ' ')); },
            'Conduit2':  r => { return toCap(r.cond2.replaceAll('_', ' ')); },
            'Talents':   r => {
                let str = [];
                str.push(getT15(r));
                str.push(getT40(r));
                str.push(getT45(r));
                str.push(getT50(r));
                return str.join('/');
            },
            'T15': r => { return getT15(r); },
            'T40': r => { return getT40(r); },
            'T45': r => { return getT45(r); },
            'T50': r => { return getT50(r); }
        },
        sorters: {
            'T15': (a,b) => { return Number(getTalentNum('15', a)) - Number(getTalentNum('15', b)); },
            'T40': (a,b) => { return Number(getTalentNum('40', a)) - Number(getTalentNum('40', b)); },
            'T45': (a,b) => { return Number(getTalentNum('45', a)) - Number(getTalentNum('45', b)); },
            'T50': (a,b) => { return Number(getTalentNum('50', a)) - Number(getTalentNum('50', b)); }
        }
    }

    function load_json(url) {
        $.getJSON(url, function(json) {
        //$.getJSON("https://raw.githubusercontent.com/balance-simc/Balance-SimC/master/" + url, function(json) {
            payload = json;

            $("#pivot").pivotUI(json, $.extend({}, defaultOptions, defaultLayout));
        });
    }

    load_json($("#fightstyle").val());

    $("#fightstyle").change(function() {
        $(".pvtRendererArea").css("opacity", 0.2);
        load_json($(this).val());
    });

    $("#save").on("click", function() {
        let config = $("#pivot").data("pivotUIOptions");
        let config_copy = {};

        config_copy["rows"] = config.rows;
        config_copy["cols"] = config.cols;
        config_copy["rowOrder"] = config.rowOrder;
        config_copy["colOrder"] = config.colOrder;
        config_copy["rendererName"] = config.rendererName
        config_copy["inclusions"] = config.inclusions;
        config_copy["exclusions"] = config.exclusions;

        Cookies.set("pivotLayout", JSON.stringify(config_copy));
    });
    $("#load").on("click", function() {
        let config = $("#pivot").data("pivotUIOptions");

        $("#pivot").pivotUI(payload, $.extend(config, JSON.parse(Cookies.get("pivotLayout"))), true);
    });
    $("#clear").on("click", function() {
        Cookies.remove("pivotLayout");
    });
    $("#reset").on("click", function() {
        let config = $("#pivot").data("pivotUIOptions");

        $("#pivot").pivotUI(payload, $.extend(config, defaultLayout), true);
    });

    $("#nav a.load").click(function(event) {
        $("#main").remove();
        $(".frames").width("100%");
        $("#side").height("96vh");
    });
});
(async () => {
    const content = await fetch('https://api.github.com/repos/balance-simc/Balance-SimC/contents/');
    const c_json = await content.json();
    let htmlString = '<ul>';
    for (let file of c_json) {
        let ext = file.name.split('.').pop();
        if (ext == 'txt' && file != 'faq.txt') {
            htmlString += `<li><a class="load" href="${file.name}" target="frame">${file.name}</a></li>`;
        }
    }
    htmlString += '</ul>';
    document.getElementById('dir').innerHTML = htmlString;
    $("#dir").find("a.load").click(function(event) {
        $("#main").remove();
        $(".frames").width("100%");
        $("#side").height("96vh");
    });
})()
function loadiFrame(f) {
    try {
        let ifdoc = f.contentWindow.document;
        if (ifdoc.contentType == "text/plain" || ifdoc.mimeType == "text/plain") {
            ifdoc.body.style.color = '#FF7D0A';
            // As requested by Tettles
            ifdoc.body.style.fontFamily = "Comic Sans MS, Comic Sans, cursive, sans-serif";
        }
    }
    catch(e) {
        return;
    }
}
