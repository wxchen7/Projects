const fs = require('fs')

const request = require('syncrequest')
const cheerio = require('cheerio')

const log = console.log.bind(console)

class Movie {
    constructor() {
        this.name = ''
        this.score = 0
        this.quote = ''
        this.ranking = 0
        this.coverUrl = ''
    }
}

const clean = (movie) => {
    let m = movie
    let o = {
        name: m.Name,
        score: Number(m.score),
        quote: m._quote,
        ranking: Number(m.ranking),
        coverUrl: m.cover_url,
        otherNames: m.other_names,
    }
    return o
}

const movieFromDiv = (div) => {
    let e = cheerio.load(div)
    let movie = new Movie()
    // text() 相当于 innerText
    movie.name = e('.title').text()
    movie.score = Number(e('.rating_num').text())
    movie.quote = e('.inq').text()
    let pic = e('.pic')
    movie.ranking = Number(pic.find('em').text())
    // attr 用来获取元素属性
    movie.coverUrl = pic.find('img').attr('src')
    let other = e('.other').text()
    movie.otherNames = other.slice(3).split(' / ').join('|')
    return movie
}

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

const cachedUrl = (url) => {
    // 确定缓存的文件名
    let dir = 'cached_html'
    ensureDir(dir)
    let cacheFile = dir + '/' + url.split('?')[1] + '.html'
    let exists = fs.existsSync(cacheFile)
    if (exists) {
        let data = fs.readFileSync(cacheFile)
        return data
    } else {
        let r = request.get.sync(url)
        // r.body 是 http response body 的内容
        let body = r.body
        // 写入缓存
        fs.writeFileSync(cacheFile, body)
        return body
    }
}

const moviesFromUrl = (url) => {
    let body = cachedUrl(url)
    let e = cheerio.load(body)
    let movieDivs = e('.item')
    // 循环处理 25 个 .item
    let movies = []
    for (let i = 0; i < movieDivs.length; i++) {
        let div = movieDivs[i]
        let m = movieFromDiv(div)
        movies.push(m)
    }
    return movies
}

const saveMovie = (movies) => {
    let s = JSON.stringify(movies, null, 2)
    // 把 json 格式字符串写入到 文件 中
    let path = 'douban.json'
    fs.writeFileSync(path, s)
}

const downloadCovers = (movies) => {
    let dir = 'cover'
    ensureDir(dir)

    for (let i = 0; i < movies.length; i++) {
        let m = movies[i]
        let url = m.coverUrl
        let path = dir + '/' + String(m.ranking) + '_' + m.name + '.jpg'
        request.sync(url, {
            pipe: path,
        })
    }
}

const __main = () => {
    let movies = []
    console.time('douban')
    for (let i = 0; i < 10; i++) {
        let start = i * 25
        let url = `https://movie.douban.com/top250?start=${start}&filter=`
        let moviesInPage = moviesFromUrl(url)
        movies = [...movies, ...moviesInPage]
    }
    log('movies', movies.length)
    saveMovie(movies)
    downloadCovers(movies)
    console.timeEnd('douban')
    log('抓取成功, 数据已经写入到 douban.json 中')
}

__main()
