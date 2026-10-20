import type {ModuleBinding,ModuleDefinition,ModuleFocus,ModuleInstance,ModuleLoader,ModuleServices} from './contracts';
/** Only allowlisted built-in modules. No imports, scripts or paths from Markdown. */
export class TaskModuleHost {
  private active:ModuleInstance|null=null;private key='';private generation=0;private dead=false;
  private loaded=new Map<string,Promise<ModuleDefinition>>();
  constructor(private registry:ReadonlyMap<string,ModuleLoader>,private services:ModuleServices){}
  async sync(root:HTMLElement|null,focus:ModuleFocus|null,bindings:ModuleBinding[]):Promise<void>{
    const binding=focus&&bindings.find(b=>b.taskId===focus.taskId),loader=binding&&this.registry.get(binding.moduleId);
    const key=root&&focus&&binding&&loader?focus.key+':'+JSON.stringify(binding):'';
    if(this.dead)return;
    if(key&&key===this.key&&this.active){this.active.update(focus!);this.active.mount(root!);return;}
    const generation=++this.generation;this.active?.dispose();this.active=null;this.key=key;
    if(!key||!binding||!loader||!focus||!root)return;
    root.textContent='Opening study module…';
    try{
      let definition=this.loaded.get(binding.moduleId);if(!definition){definition=loader();this.loaded.set(binding.moduleId,definition);}
      const module=await definition;if(module.id!==binding.moduleId||module.schemaVersion!==1)throw new Error('Unsupported module definition.');
      if(this.dead||generation!==this.generation)return;
      const instance=await module.create(focus,binding,this.services);
      if(this.dead||generation!==this.generation){instance.dispose();return;}this.active=instance;instance.mount(root);
    }catch(error){if(generation===this.generation){this.loaded.delete(binding.moduleId);root.textContent=error instanceof Error?error.message:'Module could not open.';this.key='';}}
  }
  destroy(){this.dead=true;++this.generation;this.active?.dispose();this.active=null;this.loaded.clear();}
}
