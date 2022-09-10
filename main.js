//region classes
class HofstedeCountryEntity {
    id
    title
    slug
    pdi
    idv
    mas
    uai
    lto
    ind
}

class Country {
    constructor(hofstedeObject) {
        this.id = hofstedeObject.id
        this.title = hofstedeObject.title
        this.slug = hofstedeObject.slug
        this.powerDistance = +hofstedeObject.pdi
        this.individualism = +hofstedeObject.idv
        this.masculinity = +hofstedeObject.mas
        this.uncertaintyAvoidance = +hofstedeObject.uai
        this.longTermOrientation = +hofstedeObject.lto
        this.indulgence = +hofstedeObject.ind
    }
}

class Comparison {
    constructor(selectedCountry, currentCountry) {
        this.selectedCountry = selectedCountry
        this.currentCountry = currentCountry

        this.powerDistance = getDiff(selectedCountry, currentCountry, 'powerDistance')
        this.individualism = getDiff(selectedCountry, currentCountry, 'individualism')
        this.masculinity = getDiff(selectedCountry, currentCountry, 'masculinity')
        this.uncertaintyAvoidance = getDiff(selectedCountry, currentCountry, 'uncertaintyAvoidance')
        this.longTermOrientation = getDiff(selectedCountry, currentCountry, 'longTermOrientation')
        this.indulgence = getDiff(selectedCountry, currentCountry, 'indulgence')

        this.totalDifference = Math.abs(this.powerDistance) + Math.abs(this.individualism)
            + Math.abs(this.masculinity) + Math.abs(this.uncertaintyAvoidance)
            + Math.abs(this.longTermOrientation) + Math.abs(this.indulgence)
    }
}

//endregion

const HOFSTEDE_TO_VECTORMAP_MAP = getHofstedeToVectormapMap()
const ALL_COUNTRIES = getHofstedeResponse()
let COMPARISON_RESULTS = []

//region initial load of constants
function getHofstedeToVectormapMap() {
    let client = new XMLHttpRequest()
    client.open('GET', 'hofstede-title-to-vectormap-name-map.json', false)
    client.send()
    return JSON.parse(client.responseText)
}

/**
 * @returns {Country[]}
 */
function getHofstedeResponse() {
    let client = new XMLHttpRequest()
    client.open('GET', 'hofstede-response.json', false)
    client.send()
    let response = JSON.parse(client.responseText)
    let result = []
    for (const x of response) {
        const country = convertToCountry(x)
        if (country) {
            result.push(country)
        }
    }
    return result
}

function convertToCountry(hofstedeCountryItem) {
    if (!isValid(hofstedeCountryItem)) {
        return null
    }
    hofstedeCountryItem.title = hofstedeCountryItem.title.replace("*", "")
    return new Country(hofstedeCountryItem)

}

function isValid(hofstedeCountryItem) {
    return isValidScore(hofstedeCountryItem.pdi)
        && isValidScore(hofstedeCountryItem.idv)
        && isValidScore(hofstedeCountryItem.mas)
        && isValidScore(hofstedeCountryItem.uai)
        && isValidScore(hofstedeCountryItem.lto)
        && isValidScore(hofstedeCountryItem.ind)
}

function isValidScore(score) {
    return score !== undefined && score >= 0
}

//endregion

//region initial load of the dropdown
function loadDropdown() {
    const dropdown = document.getElementById('country-chooser')

    //clear
    let children = dropdown.getElementsByTagName('option')
    while (children[0]) {
        children[0].parentNode.removeChild(children[0])
    }

    //add select options
    let emptyOption = document.createElement('option')
    emptyOption.setAttribute('disabled', '')
    emptyOption.setAttribute('selected', '')
    dropdown.appendChild(emptyOption)
    for (const country of ALL_COUNTRIES) {
        let option = document.createElement('option')
        option.value = country.slug
        option.innerHTML = country.title
        dropdown.appendChild(option)
    }
}

//endregion

//region getting comparison results
function getComparisonResults(countrySlug) {
    let selectedCountry = ALL_COUNTRIES.find((country) => country.slug === countrySlug)
    let list = []
    for (const country of ALL_COUNTRIES) {
        if (country.slug !== selectedCountry.slug) {
            list.push(new Comparison(selectedCountry, country))
        }
    }
    list.sort((x, y) => x.totalDifference - y.totalDifference)
    return list
}

function getDiff(x, y, propertyName) {
    return x[propertyName] - y[propertyName]
}

//endregion

//region updating the table
function clearTable() {
    let table = document.getElementById('country-list')
    let rows = table.getElementsByClassName('table-content-row')
    while (rows[0]) {
        rows[0].parentNode.removeChild(rows[0])
    }
}

function updateTable() {
    clearTable()

    let table = document.getElementById('country-list')
    for (let i = 0; i < COMPARISON_RESULTS.length; i++) {
        let row = table.insertRow()
        row.className = 'table-content-row'
        insertCell(row, (i + 1))
        // insertCell(row, COMPARISON_RESULTS[i].currentCountry.title)
        insertCell(row, createCountryTitleWithHyperlink(COMPARISON_RESULTS[i].currentCountry))
        insertCell(row, COMPARISON_RESULTS[i].totalDifference)
        insertCell(row, COMPARISON_RESULTS[i].powerDistance, true)
        insertCell(row, COMPARISON_RESULTS[i].individualism, true)
        insertCell(row, COMPARISON_RESULTS[i].masculinity, true)
        insertCell(row, COMPARISON_RESULTS[i].uncertaintyAvoidance, true)
        insertCell(row, COMPARISON_RESULTS[i].longTermOrientation, true)
        insertCell(row, COMPARISON_RESULTS[i].indulgence, true)
    }
}

function insertCell(row, value, addPlusForPositive) {
    const cell = row.insertCell()
    if (addPlusForPositive && value > 0) {
        cell.innerHTML = '+' + value
    } else {
        cell.innerHTML = '' + value
    }
}

function createCountryTitleWithHyperlink(country) {
    const link = 'https://www.hofstede-insights.com/country-comparison/' + country.slug
    return '<a href=' + link + ' class="country-cell">' + country.title + '</a>'
}

//endregion

//region event listeners
function updateData() {
    COMPARISON_RESULTS = getComparisonResults(document.getElementById('country-chooser').value)
    updateTable()
    loadGeoMap()
}

//endregion

//region geographical chart (map)

function loadGeoMap() {
    let mapData = createMapData()
    $('#map').dxVectorMap({
        bounds: [-180, 85, 180, -60],
        layers: {
            name: 'areas',
            dataSource: DevExpress.viz.map.sources.world,
            customize(elements) {
                $.each(elements, (_, element) => {
                    const found = mapData[element.attribute('name')]
                    if (found) {
                        element.applySettings({
                            color: determineColor(found.totalDifference)
                        })
                    }
                });
            },
        },
        tooltip: {
            enabled: true,
            contentTemplate(info, container) {
                const name = info.attribute('name');
                const found = mapData[name]
                if (!found) {
                    return
                }
                const node = $('<div>')
                    .append(`<h4>${name}</h4>`)
                    .appendTo(container);
                node.append(createTooltipRow(found, 'Total', 'totalDifference'))
                node.append(createTooltipRow(found, 'Power distance', 'powerDistance'))
                node.append(createTooltipRow(found, 'Individualism', 'individualism'))
                node.append(createTooltipRow(found, 'Masculinity', 'masculinity'))
                node.append(createTooltipRow(found, 'Uncertainty avoidance', 'uncertaintyAvoidance'))
                node.append(createTooltipRow(found, 'Long term orientation', 'longTermOrientation'))
                node.append(createTooltipRow(found, 'Indulgence', 'indulgence'))
            }
        },
    });
}

function createTooltipRow(comparisonResult, propertyTitle, propertyName) {
    const value = comparisonResult[propertyName]
    const valueText = propertyName !== 'totalDifference' && value > 0 ? '+' + value : value
    return '<div>' + propertyTitle + ': ' + valueText + '</div>'
}

//country name (of VectorMap) to the Comparison instance
function createMapData() {
    let result = {}
    for (const comparison of COMPARISON_RESULTS) {
        const title = comparison.currentCountry.title
        let vectorMapName = HOFSTEDE_TO_VECTORMAP_MAP[title]
        if (vectorMapName === "NOT_MAPPED") {
            //do nothing
        } else if (!vectorMapName) {
            result[title] = comparison
        } else {
            result[vectorMapName] = comparison
        }
    }
    return result
}

function isBetween(x, fromIncluded, toExcluded) {
    return x >= fromIncluded && x < toExcluded
}

function determineColor(difference) {
    const x = difference
    if (isBetween(x, 0, 50)) {
        return '#2cba00'
    } else if (isBetween(x, 50, 100)) {
        return '#a3ff00'
    } else if (isBetween(x, 100, 150)) {
        return '#fff400'
    } else if (isBetween(x, 150, 200)) {
        return '#ffa700'
    } else {
        return '#ff0000'
    }

}

//endregion

$(() => {
    loadDropdown()
    loadGeoMap()
});