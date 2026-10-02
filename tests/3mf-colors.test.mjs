import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {make3MF} from '../app/mesh.js';

// Parse the actual ZIP and namespace-aware XML with the Python standard library.
// This checks the color properties Bambu's standard 3MF importer consumes;
// it does not pretend to run Bambu Studio's GUI.
function inspect(bytes){
 const result=spawnSync('python',['-c',`
import io,json,sys,zipfile,xml.etree.ElementTree as ET
ns={'c':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02','m':'http://schemas.microsoft.com/3dmanufacturing/material/2015/02'}
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as archive:
    assert archive.testzip() is None
    for name in archive.namelist(): ET.fromstring(archive.read(name))
    root=ET.fromstring(archive.read('3D/3dmodel.model'))
    assert root.get('requiredextensions')=='m'
    resources=root.find('c:resources',ns)
    ids=[r.get('id') for r in resources]
    assert len(ids)==len(set(ids))
    palette={g.get('id'):[c.get('color') for c in g.findall('m:color',ns)] for g in resources.findall('m:colorgroup',ns)}
    assert palette and not resources.findall('c:basematerials',ns)
    objects={o.get('id'):o for o in resources.findall('c:object',ns)}
    parts=[]
    for o in objects.values():
        mesh=o.find('c:mesh',ns)
        if mesh is None:
            for c in o.findall('c:components/c:component',ns): assert c.get('objectid') in objects
            continue
        color=palette[o.get('pid')][int(o.get('pindex'))]
        vertices=[[float(v.get(k)) for k in ('x','y','z')] for v in mesh.findall('c:vertices/c:vertex',ns)]
        triangles=[]
        for t in mesh.findall('c:triangles/c:triangle',ns):
            for p in ('p1','p2','p3'): assert palette[t.get('pid')][int(t.get(p))]==color
            triangle=[int(t.get(k)) for k in ('v1','v2','v3')]
            assert all(0<=v<len(vertices) for v in triangle)
            triangles.append(triangle)
        parts.append({'name':o.get('name'),'color':color,'vertices':vertices,'triangles':triangles})
    build=[dict(b.attrib) for b in root.findall('c:build/c:item',ns)]
    for b in build: assert b['objectid'] in objects
    print(json.dumps({'palette':list(palette.values()),'parts':parts,'build':build}))
`],{input:bytes});
 assert.equal(result.status,0,result.stderr.toString());return JSON.parse(result.stdout.toString());
}
const mesh={vertices:[[0,0,0],[1,0,0],[0,1,0],[0,0,1]],triangles:[[0,2,1],[0,1,3],[1,2,3],[2,0,3]]};
function instance(key,colors,x=0,y=0){
 return {key,name:'M3 & <Torx> "Label"',x,y,config:{baseColor:colors[0],textColor:colors.at(-1)},meshes:colors.map((color,i)=>({name:['Basis','Textzeile 1','Textzeile 2','Symbol'][i],color,mesh}))};
}

test('3MF contains recognized color groups and explicit colors for every part and triangle',()=>{
 const colors=['#ffffff','#ff0000','#00ff00','#0000ff'];
 const file=inspect(make3MF([instance('label',colors),instance('label',colors,40,15)]));
 assert.deepEqual(file.palette,[colors.map(c=>c.toUpperCase()+'FF')]);
 assert.deepEqual(file.parts.map(p=>p.color),file.palette[0]);
 assert.equal(file.parts.length,4);assert.equal(file.build.length,2);
 assert.equal(file.build[0].objectid,file.build[1].objectid);
 assert.equal(file.build[1].transform,'1 0 0 0 1 0 0 0 1 40 15 0');
 for(const part of file.parts){assert.deepEqual(part.vertices,mesh.vertices);assert.deepEqual(part.triangles,mesh.triangles);assert.ok(part.name.startsWith('M3 & <Torx> "Label"'));}
});

test('Colors are reused across labels without losing their individual part assignments',()=>{
 const file=inspect(make3MF([instance('one',['#abcdef','#ffffff']),instance('two',['#ABCDEF','#000000'],40)]));
 assert.deepEqual(file.palette,[['#ABCDEFFF','#FFFFFFFF','#000000FF']]);
 assert.deepEqual(file.parts.map(p=>p.color),['#ABCDEFFF','#FFFFFFFF','#ABCDEFFF','#000000FF']);
 assert.notEqual(file.build[0].objectid,file.build[1].objectid);
});

test('One-color labels remain valid and invalid colors cannot corrupt the archive',()=>{
 const file=inspect(make3MF([instance('base',['#202b30'])]));
 assert.equal(file.parts.length,1);assert.deepEqual(file.palette,[['#202B30FF']]);
 assert.throws(()=>make3MF([instance('invalid',['red'])]),/Ungültige Farbe/);
});
