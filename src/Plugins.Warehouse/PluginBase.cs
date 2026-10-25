using Microsoft.Xrm.Sdk;
using System;

namespace Plugins.Warehouse
{
    public interface ILocalPluginContext
    {
        IPluginExecutionContext PluginExecutionContext { get; }
        IOrganizationServiceFactory OrgSvcFactory { get; }
        ITracingService TracingService { get; }
    }

    public abstract class PluginBase : IPlugin
    {
        private readonly Type pluginType;

        protected PluginBase(Type pluginType)
        {
            this.pluginType = pluginType;
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            try
            {
                var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
                var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
                ExecuteDataversePlugin(new LocalPluginContext(context, serviceFactory, tracingService));
            }
            catch (Exception exception)
            {
                tracingService.Trace("{0}: {1}", pluginType.FullName, exception);
                throw;
            }
        }

        protected abstract void ExecuteDataversePlugin(ILocalPluginContext localPluginContext);
    }

    internal sealed class LocalPluginContext : ILocalPluginContext
    {
        public LocalPluginContext(IPluginExecutionContext context, IOrganizationServiceFactory serviceFactory, ITracingService tracingService)
        {
            PluginExecutionContext = context;
            OrgSvcFactory = serviceFactory;
            TracingService = tracingService;
        }

        public IPluginExecutionContext PluginExecutionContext { get; private set; }
        public IOrganizationServiceFactory OrgSvcFactory { get; private set; }
        public ITracingService TracingService { get; private set; }
    }
}
