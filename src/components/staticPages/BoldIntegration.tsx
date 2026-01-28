/* Import Components */
import StaticPageRenderer from 'components/staticPageRenderer/StaticPageRenderer';
import BoldIntegrationContent from 'sources/staticPages/bold-integration.md?raw';

/**
 * Component that renders the BOLD integration scenarios page
 * @returns JSX Component
 */
const BoldIntegration = () => {
    return (
        <StaticPageRenderer pageContent={BoldIntegrationContent}></StaticPageRenderer>
    );
};

export default BoldIntegration;
