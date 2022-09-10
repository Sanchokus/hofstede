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
        this.difference = getDifference(selectedCountry, currentCountry)
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
    for(const country of ALL_COUNTRIES) {
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
    list.sort((x, y) => x.difference - y.difference)
    return list
}

/**
 * @param x {Country}
 * @param y {Country}
 * @returns {Number}
 */
function getDifference(x, y) {
    return getDiff(x, y, 'powerDistance')
        + getDiff(x, y, 'individualism')
        + getDiff(x, y, 'masculinity')
        + getDiff(x, y, 'uncertaintyAvoidance')
        + getDiff(x, y, 'longTermOrientation')
        + getDiff(x, y, 'indulgence')
}

function getDiff(x, y, propertyName) {
    return Math.abs(x[propertyName] - y[propertyName])
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
        let idColumn = row.insertCell()
        idColumn.innerHTML = '' + (i + 1)
        let nameColumn = row.insertCell()
        nameColumn.innerHTML = COMPARISON_RESULTS[i].currentCountry.title
        let differenceColumn = row.insertCell()
        differenceColumn.innerHTML = COMPARISON_RESULTS[i].difference
    }
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
            palette: 'Violet',
            colorGroups: [0, 50, 100, 150, 500],
            colorGroupingField: 'difference',
            customize(elements) {
                $.each(elements, (_, element) => {
                    const found = mapData[element.attribute('name')]
                    if (found) {
                        element.attribute('difference', found.difference);
                    }
                });
            },
        },
        tooltip: {
            enabled: true,
            customizeTooltip(arg) {
                if (arg.attribute('difference')) {
                    return {text: `${arg.attribute('name')}: ${arg.attribute('difference')}`};
                }
                return null;
            },
        },
    });
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

//endregion

$(() => {
    loadDropdown()
    loadGeoMap()
});