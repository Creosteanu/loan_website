
var ScreepsMap = function() {
    // Magic values
    this.containerID = "ScreepsMapContainer";
    this.canvasID = "ScreepsMapCanvas";
    this.colorKeyID = "ScreepsColorKeyContainer";
    this.layerControlsID = "ScreepsMapLayerControls";
    this.topLeftOfTerrain = this.roomNameToXY("W70N70");
    this.terrainImageRoomSize = 50;

    // Defaults
    this.setRoomSize(4);
    this.setMapBounds("W70N70","E70S70");
    this.setPadding(5);
};

ScreepsMap.prototype.colors = [
  '#FF0',
  '#E0FFFF',
  '#ADFF2F',
  '#F0E68C',
  '#FF00FF',
  '#FFE4E1',
  '#F6A',
  '#FF4500',
  '#00FF00',
  '#DDA0DD',
  '#D00000',
  '#60A'
];

ScreepsMap.prototype.setRoomSize = function(width, height) {
    this.roomWidth = width;
    if (!height) {
        height = width;
    }
    this.roomHeight = height;
}

ScreepsMap.prototype.setPadding = function(padding) {
    this.padding = padding;
}

ScreepsMap.prototype.setMapBounds = function(topLeft, bottomRight) {
    this.topLeft = this.roomNameToXY(topLeft);
    this.bottomRight = this.roomNameToXY(bottomRight);
}

ScreepsMap.prototype.setRoomData = function(data) {
    this.rooms = data;
}

ScreepsMap.prototype.setAllianceData = function(data) {
    this.alliances = data;
    this.allianceNames = Object.keys(this.alliances);
    this.allianceNames.sort();

    this.alliances['neutral'] = {
      'name': 'unaffiliated',
      'members': ['neutral'],
      'color': '#474747'
    }
    this.allianceNames.push('neutral')
}

ScreepsMap.prototype.desiredCanvasWidth = function() {
    return (this.bottomRight.x + 1 - this.topLeft.x) * this.roomWidth + 2 * this.padding;
}

ScreepsMap.prototype.desiredCanvasHeight = function() {
    return (this.bottomRight.y + 1 - this.topLeft.y) * this.roomHeight + 2 * this.padding;
}

ScreepsMap.prototype.roomNameToXY = function(name) {
    let parts = name.match(/([EW])([0-9]*)([NS])([0-9]*)/);
    let x = parseInt(parts[2]);
    if (parts[1] == "W") {
        x = ~x;
    }
    let y = parseInt(parts[4]);
    if (parts[3] == "N") {
        y = ~y;
    }
    return {"x": x, "y": y};
}

ScreepsMap.prototype.xyToRoomName = function(xy) {
    let result = "";
    result += (xy.x < 0 ? "W" + String(~xy.x) : "E" + String(xy.x));
    result += (xy.y < 0 ? "N" + String(~xy.y) : "S" + String(xy.y));
    return result;
}

ScreepsMap.prototype.roomNameToRoomCorner = function(name) {
    let xy = this.roomNameToXY(name);
    xy.x = this.padding + (xy.x - this.topLeft.x)*this.roomWidth;
    xy.y = this.padding + (xy.y - this.topLeft.y)*this.roomHeight;
    return xy;
}

ScreepsMap.prototype.roomNameToRoomCenter = function(name) {
    let xy = this.roomNameToRoomCorner(name);
    xy.x += 0.5*this.roomWidth;
    xy.y += 0.5*this.roomHeight;
    return xy;
}

ScreepsMap.prototype.hexToRgb = function(hex) {
    let shorthandRegex = /^#?([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    let result = /^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$/.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

ScreepsMap.prototype.colorForAlliance = function(aName) {
    if(!this.alliances[aName].color) {
      if(this.colors.length > 0) {
        this.alliances[aName].color = this.colors.shift()
      } else {
        var colorInt = Math.floor(Math.random() * (4096 - 0 + 1)) + 0;
        this.alliances[aName].color = '#' + colorInt.toString(16)
      }
    }
    return this.alliances[aName].color
}

ScreepsMap.prototype.drawAllianceMap = function(options) {
    this.drawOptions = options;
    if (!this.drawOptions.roomStyle) {
        this.drawOptions.roomStyle = "box";
    }

    this.resetCanvases();
    this.addCanvas("terrain");
    this.addCanvas("rooms");
    this.addCanvas("alliance_labels");
    this.loadImages(function() {
        this.drawTerrain();
        this.drawAlliances();
        this.drawGroupLabels();
    }.bind(this));
}

ScreepsMap.prototype.resetCanvases = function() {
    let container = document.getElementById(this.containerID);
    container.innerHTML = "";
    this.contexts = {};
    container.setAttribute("style", "width: " + this.desiredCanvasWidth() + "px; height: " + this.desiredCanvasHeight() + "px;");
    this.canvasZIndex = 1;
}

ScreepsMap.prototype.addCanvas = function(layerID) {
    let container = document.getElementById(this.containerID);
    let canvas = document.createElement("canvas");
    canvas.setAttribute("id", this.canvasID + '.' + layerID);
    canvas.setAttribute("width", this.desiredCanvasWidth());
    canvas.setAttribute("height", this.desiredCanvasHeight());
    canvas.setAttribute("style", "z-index: " + this.canvasZIndex + "; display: block;");
    this.canvasZIndex += 1;
    container.appendChild(canvas);
    canvas = document.getElementById(this.canvasID + '.' + layerID);
    this.contexts[layerID] = canvas.getContext("2d");
}

ScreepsMap.prototype.loadImages = function(callback) {
    this.terrainImage = new Image();
    this.terrainImage.src = "/img/screeps_terrain.png";
    this.terrainImage.onload = callback;
}

ScreepsMap.prototype.drawTerrain = function() {
    let clipX = (this.topLeft.x - this.topLeftOfTerrain.x) * this.terrainImageRoomSize;
    let clipY = (this.topLeft.y - this.topLeftOfTerrain.y) * this.terrainImageRoomSize;
    let clipWidth = (this.bottomRight.x - this.topLeft.x + 1) * this.terrainImageRoomSize;
    let clipHeight = (this.bottomRight.y - this.topLeft.y + 1) * this.terrainImageRoomSize;
    let imageWidth = (this.bottomRight.x - this.topLeft.x + 1) * this.roomWidth;
    let imageHeight = (this.bottomRight.y - this.topLeft.y + 1) * this.roomHeight;
    this.contexts["terrain"].save();
    this.contexts["terrain"].globalAlpha = 0.7;
    this.contexts["terrain"].drawImage(this.terrainImage, clipX, clipY, clipWidth, clipHeight, this.padding, this.padding, imageWidth, imageHeight);
    this.contexts["terrain"].restore();
}

ScreepsMap.prototype.drawAlliances = function() {
    for (let name of Object.keys(this.rooms)) {
        for (let aName of Object.keys(this.alliances)) {
            if (this.alliances[aName].members.indexOf(this.rooms[name].owner) != -1) {
                if (this.drawOptions.roomStyle == "blob") {
                    if (this.rooms[name].level) {
                        this.drawFadeCircle(name, this.roomWidth*2, this.roomWidth*0.7, this.colorForAlliance(aName));
                    } else {
                        this.drawFadeCircle(name, this.roomWidth*0.7, this.roomWidth*0.1, this.colorForAlliance(aName));
                    }
                } else {
                    this.drawFillBox(name, this.colorForAlliance(aName), (this.rooms[name].level > 0 ? 1 : 0.5));
                }
            }
        }
    }
}

ScreepsMap.prototype.drawGroupLabels = function() {
    let groups = this.findGroups(function(name) {
        let room = this.rooms[name];
        if (!room) { return; }
        for (let aName of Object.keys(this.alliances)) {
            if (this.alliances[aName].members.indexOf(this.rooms[name].owner) != -1) {
                if (aName == "neutral") { return; }
                return aName;
            }
        }
    }.bind(this), 10);
    for (let group of groups) {
        let center = this.geometricCenter(group.rooms);
        let title = (this.alliances[group.matchingValue].abbreviation ? this.alliances[group.matchingValue].abbreviation : this.alliances[group.matchingValue].name);
        this.drawOutlinedText(center, title, this.colorForAlliance(group.matchingValue));
        //this.drawFadeCircle(center, this.roomWidth*4, this.roomWidth*2, this.colorForAlliance(group.matchingValue));
    }
}

ScreepsMap.prototype.drawText = function(xy, text, color) {
    this.contexts["alliance_labels"].save();
    this.contexts["alliance_labels"].font = "15px Arial";
    this.contexts["alliance_labels"].fillStyle = color;
    this.contexts["alliance_labels"].textAlign = "center";
    this.contexts["alliance_labels"].fillText(text, xy.x, xy.y);
    this.contexts["alliance_labels"].restore();
}

ScreepsMap.prototype.drawOutlinedText = function(xy, text, color) {
    this.drawText({"x": xy.x - 1, "y": xy.y - 1}, text, "#000");
    this.drawText({"x": xy.x - 1, "y": xy.y + 1}, text, "#000");
    this.drawText({"x": xy.x + 1, "y": xy.y - 1}, text, "#000");
    this.drawText({"x": xy.x + 1, "y": xy.y + 1}, text, "#000");
    this.drawText(xy, text, color);
}

ScreepsMap.prototype.drawFadeCircle = function(roomName, radius, solidRadius, color) {
    let xy;
    if (typeof roomName === "string") {
        xy = this.roomNameToRoomCenter(roomName);
    } else {
        xy = roomName;
    }
    this.contexts["rooms"].beginPath();
    let rad = this.contexts["rooms"].createRadialGradient(xy.x, xy.y, solidRadius, xy.x, xy.y, radius);
    let parts = this.hexToRgb(color);
    rad.addColorStop(0, 'rgba(' + parts.r + ', ' + parts.g + ', ' + parts.b + ',1)');
    rad.addColorStop(1, 'rgba(' + parts.r + ', ' + parts.g + ', ' + parts.b + ',0)');
    this.contexts["rooms"].fillStyle = rad;
    this.contexts["rooms"].arc(xy.x, xy.y, radius, 0, Math.PI*2, false);
    this.contexts["rooms"].fill();
}

ScreepsMap.prototype.drawFillBox = function(roomName, color, alpha) {
    let xy = this.roomNameToRoomCorner(roomName);
    this.contexts["rooms"].save();
    this.contexts["rooms"].fillStyle = color;
    this.contexts["rooms"].globalAlpha = alpha;
    this.contexts["rooms"].fillRect(xy.x, xy.y, this.roomWidth, this.roomHeight);
    this.contexts["rooms"].restore();
}

ScreepsMap.prototype.drawColorKey = function() {
    let container = document.getElementById(this.colorKeyID);
    let output = '<ul class="colorKeyList">';
    for (let aName of this.allianceNames) {
        output += '<div id=#colorkey_alliance_' + aName + '>'
        output += '  <li class="colorKeyItem">';
        output += '    <span class="colorBox" style="background-color: ' + this.colorForAlliance(aName) + ';"></span>';
        output += '    <a href="index.html#alliance_' + aName + '">'
        output += '      <span class="colorLabel">' + this.alliances[aName].name + '</span>';
        output += '    </a>';
        output += '  </li>';
        output += '</div>';
    }
    output += '</ul>';
    container.innerHTML = output;
}

ScreepsMap.prototype.drawLayerControls = function() {
    let container = document.getElementById(this.layerControlsID);
    container.innerHTML = "<h3>Map Layers:</h3>";
    let ul = document.createElement("ul");
    ul.setAttribute("class", "layerControls");
    let output = '<ul class="layerControls">';
    for (let name of Object.keys(this.contexts)) {
        let li = document.createElement("li");
        li.setAttribute("class", "layerControlItem");

        let input = document.createElement("input");
        input.setAttribute("type", "checkbox");
        input.setAttribute("name", name);
        input.setAttribute("checked", true);
        let onclick = 'let canvas = document.getElementById("' + this.canvasID + '.' + '" + this.name); ';
        onclick += 'let display = canvas.style.display; ';
        onclick += 'if (display == "block") { canvas.style.display = "none"; } else { canvas.style.display = "block"; }';
        input.setAttribute("onclick", onclick);
        li.appendChild(input);

        let text = document.createTextNode(name);
        li.appendChild(text);
        ul.appendChild(li);
    }
    container.appendChild(ul);
}

ScreepsMap.prototype.findGroups = function(matchingFunc, radius) {
    let result = [];
    let checked = {};
    for (let y = this.topLeft.y; y <= this.bottomRight.y; y++) {
        for (let x = this.topLeft.x; x <= this.bottomRight.x; x++) {
            let xy = {"x": x, "y": y};
            let name = this.xyToRoomName(xy);
            if (checked[name]) { continue; }
            checked[name] = 1;
            if (!this.rooms[name]) { continue; }
            let matchingValue = matchingFunc(name);
            if (matchingValue) {
                let group = {"matchingValue": matchingValue, "rooms": []};
                result.push(this.buildGroup(group, name, matchingFunc, radius, checked));
            }
        }
    }
    return result;
}

ScreepsMap.prototype.buildGroup = function(group, name, matchingFunc, radius, checked) {
    let groupChecked = {};
    let toCheck = [name];
    group.rooms.push(name);
    while (toCheck.length > 0) {
        let checkName = toCheck.pop();
        let xy = this.roomNameToXY(checkName);
        //let minXY = {"x": Math.max(this.topLeft.x, xy.x - radius), "y": xy.y};
        let minXY = {"x": Math.max(this.topLeft.x, xy.x - radius), "y": Math.max(this.topLeft.y, xy.y - radius)};
        let maxXY = {"x": Math.min(this.bottomRight.x, xy.x + radius), "y": Math.min(this.bottomRight.y, xy.y + radius)};
        for (let y = minXY.y; y <= maxXY.y; y++) {
            for (let x = minXY.x; x <= maxXY.x; x++) {
                if (y == minXY.y && x <= xy.x) { continue; }
                let curXY = {"x": x, "y": y};
                let curName = this.xyToRoomName(curXY);
                if (!this.rooms[curName]) { continue; }
                if (groupChecked[curName] || checked[curName]) { continue; }
                groupChecked[curName] = 1;
                let matchingValue = matchingFunc(curName);
                if (matchingValue && matchingValue == group.matchingValue) {
                    checked[curName] = 1;
                    toCheck.push(curName);
                    group.rooms.push(curName);
                }
            }
        }
    }
    return group;
}

ScreepsMap.prototype.geometricCenter = function(rooms) {
    let sum = {"x": 0, "y": 0};
    for (let name of rooms) {
        let xy = this.roomNameToRoomCenter(name);
        sum.x += xy.x;
        sum.y += xy.y;
    }
    sum.x = Math.floor(sum.x / rooms.length);
    sum.y = Math.floor(sum.y / rooms.length);
    return sum;
}
