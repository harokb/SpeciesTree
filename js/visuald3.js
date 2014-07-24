var filterList = ['logo', 'red pencil', 'wikibooks', 'feature', 'star', 'symbol', 'vote', 'icon', 'question_book', 'disamb', 'edit', 'ambox', 'wiki_letter', 'speakerlink']
var portalImages = ['caribou from wagon trails', 'rose amber', 'france loiret', 'Leaf_1_web', 'Martinique.web'];
var unwantedImages = ['map'];

extend(filterList, portalImages);
extend(filterList, unwantedImages);

function extend(a, b) {
    Array.prototype.push.apply(a, b)
}

var width = 1000;
var height = 500;

var rootCircleRadius = 30;
var rootCircleCenterXPos = 30;

var childCircleRadius = 20;

var verticalMargin = 30;

var horizontalOffset = 100;
var verticalBarXPos = rootCircleCenterXPos + rootCircleRadius + horizontalOffset;

var textOffset = 30;
var barWidth = 100;

// Distance between two children
var heightBetweenChildren = 100;

function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getName(data) {
    return data.vernacularName || data.canonicalName || data.scientificName || "Error: could not find name";
}

function getScientificName(data) {
    var name = data.scientificName;

    // Used when name has date and scientist attached
    if (typeof data.authorship !== "undefined") {
        if (data.authorship === "") {
            return name;
        }

        var index = name.indexOf(data.authorship);
        if (index !== -1) {
            // remove the space before the name too
            return name.substring(0, index - 1);
        }
    }

    return name;
}


function addRemoveIconToSidebar() {
    d3.select('.sidebar').append('i')
        .attr('class', 'huge remove icon')
        .attr('id', 'removeIcon')
        .on('click', function () {
            removeSidebarContent();
            hideSidebar();
        });
}

function removeSidebarContent() {
    d3.selectAll('#speciesData').remove();
    d3.selectAll('#removeIcon').remove();
}

function showSidebar() {
    $('.sidebar').sidebar('show');
}

function hideSidebar() {
    $('.sidebar').sidebar('hide');
}

function setUpSidebar() {
    removeSidebarContent();
    addRemoveIconToSidebar();
    d3.select('#infoContainer').append('div').attr('id', 'speciesData');
    showSidebar();
}

function tearDownSidebar() {
    removeSidebarContent();
    hideSidebar();
}



function putLoader(divSelection) {
    divSelection.append('div').attr('class', 'ui active inline loader').attr('id', 'loader');
}

function removeLoader(divSelection) {
    divSelection.select('#loader').remove();
}

function showInformation(data, tree) {
    // Remove existing data, if it exists
    d3.select('#speciesData').remove();

    setUpSidebar();

    var infoSelection = d3.select('#infoContainer');
    var divSelection = infoSelection.append('div').attr('id', 'speciesData').attr('class', 'verticalLine');

    showWikipediaInformation(data, tree);
}



function showWikipediaInformation(data, tree) {
    var divSelection = d3.select('#speciesData');
    putLoader(divSelection);

    var wiki = new Wikipedia();
    var speciesName = getScientificName(data);
    var commonName = data.vernacularName;
    wiki.article(commonName, speciesName, function (data) {
        removeLoader(divSelection);
        console.log(data);
        if (typeof data === "undefined") {
            divSelection.append('h1').text('No available information');
            return;
        }

        var title = data.title;
        var content = data.extract;
        var content = removeWikiCruft(content);

        var titleText = title + " (" + tree.getTaxon() + ')';
        divSelection.append('h1').attr('class', 'header').text(titleText);
        divSelection.append('div').attr('id', 'content').html(content);

        wiki.image(commonName, speciesName, function (imagesData) {
            console.log(imagesData);
            var url = chooseImage(imagesData || []);
            if (typeof url !== "undefined") {
                divSelection.insert('img', '#content').attr('src', url).attr('alt', 'image').attr('class', 'ui huge image');
            }
        });
    });
}

function removeWikiCruft(text) {
    var lowercaseText = text.toLowerCase();

    var index = lowercaseText.indexOf('see also');
    if (index !== -1) {
        return text.substring(0, index);
    }

    var index = lowercaseText.indexOf('references');
    if (index !== -1) {
        return text.substring(0, index);
    }

    var index = lowercaseText.indexOf('bibliography');
    if (index !== -1) {
        return text.substring(0, index);
    }

    return text;
}

function containsAny(title, stringList) {
    var titleLowerCase = title.toLowerCase();
    for (var i = 0; i < stringList.length; i++) {
        var s = stringList[i].toLowerCase();
        if (titleLowerCase.indexOf(s) !== -1) {
            return true;
        }
    }
    return false;
}

function chooseImage(imagesData) {
    for (var i = 0; i < imagesData.length; i++) {
        var image = imagesData[i];
        var title = image.title;
        var mime = image.imageinfo[0].mime;
        var url = image.imageinfo[0].url;
        var size = image.imageinfo[0].size;

        // For speacial wikipedia icons, video and audio
        if (containsAny(title, filterList) || containsAny(url, filterList) || mime.indexOf('application') !== -1) {
            continue;
        }

        // Giant image or icon
        if (size >= 5000000 || size <= 40000) {
            continue;
        }

        return url;
    }
}

function expandSuperTree(data, svgContainer, tree) {
    if (tree.isAtKingdomLevel()) {
        console.info("Reached kingdom level. Can't go up.");
        return;
    }

    removeSidebarContent();
    hideSidebar();

    tree.setRootToParent();
    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}

function showChildren(data, svgContainer, tree) {
    if (tree.isSpeciesLevel()) {
        console.info("Reached species level. Can't go down.");
        return;
    }

    removeSidebarContent();
    hideSidebar();

    tree.setRootToChild(data.id);
    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}

function clearSvg(svgContainer) {
    svgContainer.selectAll('g').remove();
    svgContainer.selectAll('circle').remove();
    svgContainer.selectAll('image').remove();
    svgContainer.selectAll('line').remove();
}

function resizeSvg(svgContainer, children) {
    resizeSvgHeight(svgContainer, children);
}

function resizeSvgHeight(svgContainer, children) {
    // Distance between two children
    var contentHeight = Math.max(2 * rootCircleRadius, (children.length - 1) * heightBetweenChildren);

    var marginHeight = 2 * verticalMargin;

    height = contentHeight + marginHeight;
    svgContainer.attr('height', height);
}

function addNoInformationAvailableText(childrenSelection) {

    childrenSelection.append('text')
        .attr('x', verticalBarXPos + textOffset)
        .attr('y', verticalMargin + 35)
        .text('No available information')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'rgb(83, 83, 83)')

}

function addRootCircle(svgContainer, tree) {
    var height = svgContainer.attr('height');

    svgSelection.append('circle')
        .attr("cx", rootCircleCenterXPos)
        .attr("cy", verticalMargin + rootCircleRadius)
        .attr("r", rootCircleRadius)
        .style("fill", "green")
        .on("click", function (data) {
            expandSuperTree(data, svgContainer, tree);
        });
}

function addHorizontalLineFromCircle(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', rootCircleCenterXPos + rootCircleRadius)
        .attr('y1', verticalMargin + rootCircleRadius)
        .attr('x2', verticalBarXPos)
        .attr('y2', verticalMargin + rootCircleRadius)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addVerticalLine(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', verticalBarXPos)
        .attr('y1', verticalMargin)
        .attr('x2', verticalBarXPos)
        .attr('y2', height - verticalMargin)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addHorizontalBars(childrenSelection, numChildren) {
    for (var i = 0; i < numChildren; i++) {
        var height = i * heightBetweenChildren;
        var yPos = height + verticalMargin;


        childrenSelection.append('line')
            .attr('x1', verticalBarXPos)
            .attr('y1', yPos)
            .attr('x2', verticalBarXPos + barWidth)
            .attr('y2', yPos)
            .attr('stroke-width', 5)
            .attr('stroke', 'black');
    }
}

function addCircles(childrenSelection, childrenData, tree) {
    var circles = childrenSelection.selectAll('image')
        .data(childrenData)
        .enter()
        .append('image');

    var num = 0;
    var remainingSpace = height - 2 * verticalMargin;

    var circleAttributes = circles
        .attr('x', verticalBarXPos + barWidth - 10)
        .attr('y', function (data, index) {
            var height = index * heightBetweenChildren;
            var yPos = height + verticalMargin - 15;
            return yPos;
        })
        .attr('height', 30)
        .attr('width', 30)
        .attr('xlink:href', 'image/info.png')
        .on("click", function (data) {
            showInformation(data, tree);
        });
}

function addText(svgContainer, tree, childrenSelection, childrenData) {
    var text = childrenSelection.selectAll("text")
        .data(childrenData)
        .enter()
        .append("text");

    var textAttributes = text
        .attr('x', verticalBarXPos + barWidth + textOffset)
        .attr('y', function (data, index) {
            var height = index * heightBetweenChildren;
            var textAdjustment = 6;
            var yPos = height + verticalMargin + textAdjustment;
            return yPos;
        })
        .text(function (data) {
            var text = capitalise(getName(data));
            if (data.numDescendants !== 0 && data.numDescendants !== undefined) {
                var text = text + ' (' + data.numDescendants + ' descendants)'
            }
            return text;
        })
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'rgb(83, 83, 83)')
        .on('click', function (data) {
            showChildren(data, svgContainer, tree);
        });
}

function sortByNumberDescendants(childrenData) {
    return childrenData.sort(function (a, b) {
        var keyA = a.numDescendants || 0,
            keyB = b.numDescendants || 0;
        // Compare the 2 dates
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
    });
}

function addChildrenToSvg(svgContainer, tree, childrenData) {
    var childrenSelection = svgContainer.append('g').attr('id', 'childrenGroup');
    var numChildren = childrenData.length;
    console.log(childrenData);
    if (numChildren === 0) {
        addNoInformationAvailableText(childrenSelection);
        return;
    }

    childrenData = sortByNumberDescendants(childrenData);

    addHorizontalBars(childrenSelection, numChildren);
    addCircles(childrenSelection, childrenData, tree);
    addText(svgContainer, tree, childrenSelection, childrenData);
}

function addChildren(svgContainer, tree, children) {
    clearSvg(svgContainer)
    resizeSvg(svgContainer, children);
    addRootCircle(svgContainer, tree);
    addHorizontalLineFromCircle(svgContainer);
    addVerticalLine(svgContainer);
    addChildrenToSvg(svgContainer, tree, children);
}


var selection = d3.select("#speciesContainer");
var svgSelection = selection.append("svg")
    .attr('width', width)
    .attr('height', height);

var tree = new Tree();
tree.fetchBasicChildrenInformation(function (children) {
    addChildren(svgSelection, tree, children);
});
