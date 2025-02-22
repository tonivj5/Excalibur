import * as ex from '@excalibur';
import { TagComponent } from '@excalibur';

class FakeComponent extends ex.Component {
  constructor(public type: string) {
    super();
  }
}

describe('An entity', () => {
  it('exists', () => {
    expect(ex.Entity).toBeDefined();
  });

  it('can be constructed with a list of components', () => {
    const e = new ex.Entity([new FakeComponent('A'), new FakeComponent('B'), new FakeComponent('C')]);

    expect(e.has('A')).toBe(true);
    expect(e.has('B')).toBe(true);
    expect(e.has('C')).toBe(true);
  });

  it('can override existing components', () => {
    const e = new ex.Entity([
      new FakeComponent('A')
    ]);

    spyOn(e, 'removeComponent');
    const newComponent = new FakeComponent('A');
    e.addComponent(newComponent, true);
    expect(e.removeComponent).toHaveBeenCalledWith(newComponent, true);
  });

  it('has a unique id', () => {
    const entity1 = new ex.Entity();
    const entity2 = new ex.Entity();
    const entity3 = new ex.Entity();
    expect(entity1.id).not.toBe(entity2.id);
    expect(entity1.id).not.toBe(entity3.id);
    expect(entity2.id).not.toBe(entity3.id);
  });

  it('can have a name', () => {
    const e = new ex.Entity([], 'my-name');
    expect(e.name).toBe('my-name');
  });

  it('has a default name', () => {
    const e = new ex.Entity();
    expect(e.name).toBe('anonymous');
  });

  it('can be killed', () => {
    const entity = new ex.Entity();
    expect(entity.isKilled()).toBe(false);
    entity.kill();
    expect(entity.isKilled()).toBe(true);
  });

  it('can have types by component', () => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');
    const typeB = new FakeComponent('B');
    expect(entity.types).toEqual([]);

    entity.addComponent(typeA);
    expect(entity.types).toEqual(['A']);
    entity.addComponent(typeB);
    expect(entity.types).toEqual(['A', 'B']);
    entity.removeComponent(typeA, true);
    expect(entity.types).toEqual(['B']);
    entity.removeComponent(typeB, true);
    expect(entity.types).toEqual([]);
  });

  it('can get a list of components', () => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');
    const typeB = new FakeComponent('B');
    const typeC = new FakeComponent('C');

    expect(entity.getComponents()).toEqual([]);

    entity.addComponent(typeA).addComponent(typeB).addComponent(typeC);

    expect(entity.getComponents().sort((a, b) => a.type.localeCompare(b.type))).toEqual([typeA, typeB, typeC]);
  });

  it('can have type from tag components', () => {
    const entity = new ex.Entity();
    const isOffscreen = new TagComponent('offscreen');
    const nonTag = new FakeComponent('A');

    expect(entity.types).toEqual([]);
    entity.addComponent(isOffscreen);
    entity.addComponent(nonTag);

    expect(entity.types).toEqual(['offscreen', 'A']);
    expect(entity.tags).toEqual(['offscreen']);
    expect(entity.hasTag('offscreen')).toBeTrue();
  });

  it('can add and remove tags', () => {
    const entity = new ex.Entity();
    entity.addTag('someTag1');
    entity.addTag('someTag2');
    entity.addTag('someTag3');

    expect(entity.tags).toEqual(['someTag1', 'someTag2', 'someTag3']);

    // deferred removal
    entity.removeTag('someTag3');
    expect(entity.tags).toEqual(['someTag1', 'someTag2', 'someTag3']);
    entity.processComponentRemoval();
    expect(entity.tags).toEqual(['someTag1', 'someTag2']);

    // immediate removal
    entity.removeTag('someTag2', true);
    expect(entity.tags).toEqual(['someTag1']);
  });

  it('can be observed for added changes', (done) => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');
    entity.componentAdded$.register({
      notify: (change) => {
        expect(change.type).toBe('Component Added');
        expect(change.data.entity).toBe(entity);
        expect(change.data.component).toBe(typeA);
        done();
      }
    });
    entity.addComponent(typeA);
  });

  it('can be observed for removed changes', (done) => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');

    entity.addComponent(typeA);
    entity.componentRemoved$.register({
      notify: (change) => {
        expect(change.type).toBe('Component Removed');
        expect(change.data.entity).toBe(entity);
        expect(change.data.component).toBe(typeA);
        done();
      }
    });
    entity.removeComponent(typeA);
    entity.processComponentRemoval();
  });

  it('can be cloned', () => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');
    const typeB = new FakeComponent('B');
    entity.addComponent(typeA);
    entity.addComponent(typeB);
    entity.addChild(new ex.Entity([new FakeComponent('Z')]));

    const clone = entity.clone();
    expect(clone).not.toBe(entity);
    expect(clone.id).not.toBe(entity.id);
    expect(clone.get('A')).not.toBe(entity.get('A'));
    expect(clone.get('B')).not.toBe(entity.get('B'));
    expect(clone.get('A').type).toBe(entity.get('A').type);
    expect(clone.get('B').type).toBe(entity.get('B').type);
    expect(clone.children.length).toBe(1);
    expect(clone.children[0].types).toEqual(['Z']);
  });

  it('can be initialized with a template', () => {
    const entity = new ex.Entity();
    const template = new ex.Entity([new FakeComponent('A'), new FakeComponent('B')]).addChild(
      new ex.Entity([new FakeComponent('C'), new FakeComponent('D')]).addChild(new ex.Entity([new FakeComponent('Z')]))
    );

    expect(entity.getComponents()).toEqual([]);
    entity.addTemplate(template);
    expect(entity.types.sort((a, b) => a.localeCompare(b))).toEqual(['A', 'B']);
    expect(entity.children[0].types.sort((a, b) => a.localeCompare(b))).toEqual(['C', 'D']);
    expect(entity.children[0].children[0].types).toEqual(['Z']);
  });

  it('can be checked if it has a component', () => {
    const entity = new ex.Entity();
    const typeA = new FakeComponent('A');
    const typeB = new FakeComponent('B');
    entity.addComponent(typeA);
    entity.addComponent(typeB);

    expect(entity.has('A')).toBe(true);
    expect(entity.has('B')).toBe(true);
    expect(entity.has('C')).toBe(false);
  });

  it('has an overridable initialize lifecycle handler', (done) => {
    const entity = new ex.Entity();
    entity.onInitialize = () => {
      done();
    };

    entity._initialize(null);
  });

  it('has an event initialize handler', (done) => {
    const entity = new ex.Entity();
    entity.on('initialize', () => {
      done();
    });

    entity._initialize(null);
  });

  it('has an overridable preupdate lifecycle handler', (done) => {
    const entity = new ex.Entity();
    entity.onPreUpdate = () => {
      done();
    };

    entity._preupdate(null, 1);
  });

  it('has an event preupdate handler', (done) => {
    const entity = new ex.Entity();
    entity.on('preupdate', () => {
      done();
    });

    entity._preupdate(null, 1);
  });

  it('has an overridable postupdate lifecycle handler', (done) => {
    const entity = new ex.Entity();
    entity.onPostUpdate = () => {
      done();
    };

    entity._postupdate(null, 1);
  });

  it('has an event postupdate handler', (done) => {
    const entity = new ex.Entity();
    entity.on('postupdate', () => {
      done();
    });

    entity._postupdate(null, 1);
  });

  it('can be parented', () => {
    const parent = new ex.Entity();
    const child = new ex.Entity();
    parent.addChild(child);

    expect(child.parent).toBe(parent);
    expect(parent.children).toEqual([child]);
    expect(parent.parent).toBe(null);
  });

  it('can be grandparented', () => {
    const parent = new ex.Entity();
    const child = new ex.Entity();
    const grandchild = new ex.Entity();
    parent.addChild(child.addChild(grandchild));

    expect(grandchild.parent).toBe(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toEqual([child]);

    expect(grandchild.getAncestors()).toEqual([parent, child, grandchild]);
    expect(parent.getDescendants()).toEqual([parent, child, grandchild]);
  });

  it('can be unparented', () => {
    const parent = new ex.Entity();
    const child = new ex.Entity();
    const grandchild = new ex.Entity();
    parent.addChild(child.addChild(grandchild));

    expect(child.parent).toBe(parent);

    child.unparent();

    expect(child.parent).toBe(null);
  });

  it('can\'t have a cycle', () => {
    const parent = new ex.Entity();
    const child = new ex.Entity();

    parent.addChild(child);

    expect(() => {
      child.addChild(parent);
    }).toThrowError('Cycle detected, cannot add entity');
  });

  it('can\'t parent if already parented', () => {
    const parent = new ex.Entity();
    const child = new ex.Entity();
    const otherparent = new ex.Entity();

    parent.addChild(child);
    expect(() => {
      otherparent.addChild(child);
    }).toThrowError('Entity already has a parent, cannot add without unparenting');
  });

  it('can observe components added', () => {
    const e = new ex.Entity();
    const addedSpy = jasmine.createSpy('addedSpy');
    e.componentAdded$.register({
      notify: addedSpy
    });
    const component = new FakeComponent('A');
    e.addComponent(component);
    expect(addedSpy).toHaveBeenCalledTimes(1);
  });

  it('can observe components removed', () => {
    const e = new ex.Entity();
    const removedSpy = jasmine.createSpy('removedSpy');
    e.componentRemoved$.register({
      notify: removedSpy
    });
    const component = new FakeComponent('A');
    e.addComponent(component);
    e.removeComponent(component);
    e.processComponentRemoval();
    expect(removedSpy).toHaveBeenCalledTimes(1);
  });

  it('can add and remove children in the ECS world', () => {
    const e = new ex.Entity();
    const child = new ex.Entity();
    const grandchild = new ex.Entity();
    e.addChild(child.addChild(grandchild));

    const world = new ex.World(new ex.Scene());

    world.add(e);

    expect(world.entityManager.entities.length).toBe(3);

    grandchild.addChild(new ex.Entity());

    expect(world.entityManager.entities.length).toBe(4);

    child.removeChild(grandchild);

    expect(world.entityManager.entities.length).toBe(2);
  });

  it('will inherit scene from a parent entity', () => {
    const e = new ex.Entity([], 'e');
    const child = new ex.Entity([], 'child');
    const grandchild = new ex.Entity([], 'grandchild');

    const scene = new ex.Scene();
    e.addChild(child.addChild(grandchild));
    scene.add(e);
    expect(e.scene).toBe(scene);
    expect(child.scene).toBe(scene);
    expect(grandchild.scene).toBe(scene);

    e.removeChild(child);
    expect(e.scene).toBe(scene);
    expect(child.scene).toBe(null);
    expect(child.parent).toBe(null);
    expect(grandchild.scene).toBe(null);
    expect(grandchild.parent).toBe(child);

    e.addChild(child);
    expect(e.scene).toBe(scene);
    expect(child.scene).toBe(scene);
    expect(grandchild.scene).toBe(scene);

    // deferred removal
    scene.remove(e);
    expect(e.scene).not.toBe(null);
    expect(child.scene).not.toBe(null);
    expect(grandchild.scene).not.toBe(null);

    scene.world.entityManager.processEntityRemovals();
    expect(e.scene).toBe(null);
    expect(child.scene).toBe(null);
    expect(grandchild.scene).toBe(null);
  });

  it('will inherit the scene from the parent entity after being added', () => {
    const parent = new ex.Entity([], 'parent');
    const child = new ex.Entity([], 'child');

    const scene = new ex.Scene();

    scene.add(parent);

    expect(parent.scene).toBe(scene);

    parent.addChild(child);

    expect(child.scene).toBe(scene);
  });

  it('can removeAllChildren correctly', () => {
    const e = new ex.Entity();
    const child1 = new ex.Entity();
    const child2 = new ex.Entity();
    const child3 = new ex.Entity();
    const child4 = new ex.Entity();
    const child5 = new ex.Entity();
    const child6 = new ex.Entity();
    e.addChild(child1);
    e.addChild(child2);
    e.addChild(child3);
    e.addChild(child4);
    e.addChild(child5);
    e.addChild(child6);

    expect(e.children.length).toBe(6);

    e.removeAllChildren();

    expect(e.children.length).toBe(0);
  });

  it('will remove children from the parent when a child is killed', () => {
    const e = new ex.Entity();
    const child1 = new ex.Entity();
    const child2 = new ex.Entity();
    const child3 = new ex.Entity();
    const child4 = new ex.Entity();
    const child5 = new ex.Entity();
    const child6 = new ex.Entity();
    const grandChild = new ex.Entity();
    e.addChild(child1);
    e.addChild(child2);
    e.addChild(child3);
    e.addChild(child4);
    e.addChild(child5);
    e.addChild(child6);
    child6.addChild(grandChild);

    expect(e.children.length).toBe(6);

    child1.kill();
    child2.kill();
    child3.kill();
    child4.kill();
    child5.kill();
    child6.kill();

    expect(e.children.length).toBe(0);
    expect(child6.children.length).toBe(1);
    expect(grandChild.parent).toBe(child6);
  });

  it('will remove children from the parent when a child is removed', () => {
    const e = new ex.Entity();
    const child1 = new ex.Entity();
    const child2 = new ex.Entity();
    const child3 = new ex.Entity();
    const child4 = new ex.Entity();
    const child5 = new ex.Entity();
    const child6 = new ex.Entity();
    const grandChild = new ex.Entity();
    e.addChild(child1);
    e.addChild(child2);
    e.addChild(child3);
    e.addChild(child4);
    e.addChild(child5);
    e.addChild(child6);
    child6.addChild(grandChild);

    expect(e.children.length).toBe(6);

    e.removeChild(child1);
    e.removeChild(child2);
    e.removeChild(child3);
    e.removeChild(child4);
    e.removeChild(child5);
    e.removeChild(child6);

    expect(e.children.length).toBe(0);
    expect(child6.children.length).toBe(1);
    expect(grandChild.parent).toBe(child6);
  });
});
