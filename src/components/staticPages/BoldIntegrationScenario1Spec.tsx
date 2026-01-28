/* Import Components */
import StaticPageRenderer from 'components/staticPageRenderer/StaticPageRenderer';
import BoldIntegrationScenario1Content from 'sources/staticPages/bold-integration-scenario1-spec.md?raw';

/**
 * Component that renders the BOLD integration Scenario 1 technical specification page
 * @returns JSX Component
 */
const BoldIntegrationScenario1Spec = () => {
    return (
        <StaticPageRenderer pageContent={BoldIntegrationScenario1Content}></StaticPageRenderer>
    );
};

export default BoldIntegrationScenario1Spec;
